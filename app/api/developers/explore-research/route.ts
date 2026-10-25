import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiError, finishUsage, sameOrigin } from "@/lib/tic/credentials";
import { normalizeResearchTicker } from "@/lib/tic/research-snapshot";
import { getProjectRole, listAccessibleProjects } from "@/lib/tic/organizations";
import { canWriteOrganization } from "@/lib/tic/organization-rbac";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,128}$/;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const started = performance.now();
  if (!sameOrigin(request)) return apiError(403, "invalid_origin", "Invalid request origin.", requestId);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError(401, "unauthorized", "Sign in to use the API explorer.", requestId);
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Invalid body");
    body = parsed as Record<string, unknown>;
  } catch { return apiError(400, "invalid_request", "Send a JSON object.", requestId); }
  const keyId = typeof body.keyId === "string" ? body.keyId : "";
  const ticker = normalizeResearchTicker(body.ticker);
  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!UUID.test(keyId) || !ticker || !IDEMPOTENCY_KEY.test(idempotencyKey)) return apiError(400, "invalid_request", "Select a research key, supported company ticker, and valid idempotency key.", requestId);

  try {
    const admin = createAdminClient();
    const projects = await listAccessibleProjects(admin, user.id);
    const projectIds = projects.map(project => project.id);
    if (!projectIds.length) return apiError(404, "key_not_found", "This credential is unavailable in your organization.", requestId);
    const { data: key, error: keyError } = await admin.from("developer_api_keys")
      .select("id,key_hash,project_id,scopes,revoked_at,expires_at")
      .eq("id", keyId).in("project_id", projectIds).maybeSingle();
    if (keyError) throw keyError;
    if (!key) return apiError(404, "key_not_found", "This credential is unavailable in your account.", requestId);
    const role = await getProjectRole(admin, key.project_id, user.id);
    if (!role || !canWriteOrganization(role)) return apiError(403, "forbidden", "Your organization role cannot run API explorer requests.", requestId);
    const { data, error } = await admin.rpc("enqueue_tic_research_job", {
      p_hash: key.key_hash, p_ticker: ticker, p_idempotency_key: idempotencyKey,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : null;
    const responseId = row?.request_id ?? requestId;
    if (!row || row.reason) {
      const reason = row?.reason;
      const status = reason === "quota_exceeded" || reason === "job_quota_exceeded" ? 429
        : reason === "insufficient_scope" ? 403 : reason === "idempotency_conflict" ? 409
        : reason === "invalid_request" ? 400 : reason === "invalid_key" ? 401 : 503;
      const message = reason === "job_quota_exceeded" ? "This project has reached its limit of 10 research jobs per hour."
        : reason === "idempotency_conflict" ? "This idempotency key was already used with a different ticker."
        : reason === "insufficient_scope" ? "This key lacks research:run access."
        : reason === "quota_exceeded" ? "This key has reached its request limit."
        : reason === "invalid_request" ? "The research request is invalid."
        : reason === "invalid_key" ? "This key is expired, revoked, or invalid."
        : "Research capacity is temporarily unavailable.";
      if (row?.request_id) await finishUsage(admin, row.request_id, status, started);
      return apiError(status, reason ?? "service_unavailable", message, responseId);
    }
    await finishUsage(admin, responseId, row.is_duplicate ? 200 : 202, started);
    return Response.json({ job_id: row.job_id, status: row.job_status, duplicate: row.is_duplicate, request_id: responseId }, {
      status: row.is_duplicate ? 200 : 202,
      headers: { "Cache-Control": "private, no-store", "X-Request-Id": responseId },
    });
  } catch {
    return apiError(503, "service_unavailable", "The API explorer is temporarily unavailable.", requestId);
  }
}
