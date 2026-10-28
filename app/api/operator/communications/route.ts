import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getServerUser } from "@/lib/supabase/auth-user";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { articles as builtInArticles } from "@/app/blog/articles";

export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const maintenanceStates = new Set(["scheduled", "ongoing", "completed"]);
const postStates = new Set(["draft", "published"]);

function text(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function validDate(value: unknown, optional = false): string | null | undefined {
  if ((value === null || value === "") && optional) return null;
  if (typeof value !== "string") return undefined;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : undefined;
}

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-+$/g, "");
}

export async function GET(request: Request) {
  const user = await getServerUser();
  if (!user) return json({ error: "Sign in to continue." }, 401);
  if (!isTidelightOperator(user)) return json({ error: "Operator access is required." }, 403);
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const offset = Number(params.get("offset") ?? "0");
  if ((kind !== "maintenance" && kind !== "blog") || !Number.isInteger(offset) || offset < 0 || offset > 1000000) {
    return json({ error: "Choose a valid content list and page offset." }, 400);
  }
  const client = createAdminClient();
  const table = kind === "maintenance" ? "tic_status_maintenance" : "tic_blog_posts";
  const columns = kind === "maintenance"
    ? "id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at"
    : "id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at";
  const orderColumn = kind === "maintenance" ? "starts_at" : "updated_at";
  const { data, count, error } = await client.from(table).select(columns, { count: "exact" })
    .order(orderColumn, { ascending: false }).order("id", { ascending: true }).range(offset, offset + 49);
  if (error) return json({ error: "The content list could not be loaded." }, 500);
  return json({ items: data ?? [], hasMore: offset + (data?.length ?? 0) < (count ?? 0) });
}

export async function POST(request: Request) {
  return save(request, false);
}

export async function PATCH(request: Request) {
  return save(request, true);
}

async function save(request: Request, update: boolean) {
  const user = await getServerUser();
  if (!user) return json({ error: "Sign in to continue." }, 401);
  if (!isTidelightOperator(user)) return json({ error: "Operator access is required." }, 403);

  let input: Record<string, unknown>;
  try {
    const value = await request.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) return json({ error: "Check the content and try again." }, 400);
    input = value as Record<string, unknown>;
  } catch {
    return json({ error: "Check the content and try again." }, 400);
  }

  const id = typeof input.id === "string" ? input.id : "";
  if (update && !id) return json({ error: "Select a saved item to update." }, 400);
  const admin = createAdminClient();

  if (input.kind === "maintenance") {
    if (update && input.action === "resolve") {
      const resolvedAt = new Date().toISOString();
      const { data: current, error: currentError } = await admin.from("tic_status_maintenance")
        .select("status,starts_at").eq("id", id).maybeSingle();
      if (currentError) return json({ error: "Maintenance could not be loaded. Try again." }, 500);
      if (current && ["scheduled", "ongoing"].includes(current.status) && Date.parse(current.starts_at) > Date.parse(resolvedAt)) {
        return json({ error: "This maintenance is scheduled for the future and can be resolved after it starts." }, 409);
      }
      const { data, error } = await admin.from("tic_status_maintenance")
        .update({ status: "completed", ends_at: resolvedAt, updated_at: resolvedAt })
        .eq("id", id)
        .in("status", ["scheduled", "ongoing"])
        .lte("starts_at", resolvedAt)
        .select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at")
        .maybeSingle();
      if (error) return json({ error: "Maintenance could not be marked resolved. Try again." }, 400);
      if (!data) return json({ error: "This maintenance notice is already resolved or is no longer active." }, 409);
      return json({ item: data });
    }
    const title = text(input.title, 140);
    const subtitle = text(input.subtitle, 240);
    const message = text(input.message, 12000);
    const startsAt = validDate(input.startsAt);
    const endsAt = validDate(input.endsAt, true);
    const status = typeof input.status === "string" ? input.status : "";
    const affectedServices = Array.isArray(input.affectedServices)
      ? [...new Set(input.affectedServices.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean).slice(0, 30))]
      : [];
    if (!title || !subtitle || !message || !startsAt || endsAt === undefined || !maintenanceStates.has(status)) {
      return json({ error: "Add a heading, subheading, message, valid start time, and maintenance state." }, 400);
    }
    let existingMaintenance: { status: string; ends_at: string | null } | null = null;
    if (update && status === "completed") {
      const { data, error } = await admin.from("tic_status_maintenance")
        .select("status,ends_at").eq("id", id).maybeSingle();
      if (error) return json({ error: "Maintenance could not be loaded. Try again." }, 500);
      existingMaintenance = data;
    }
    const completedAt = status === "completed"
      ? existingMaintenance?.status === "completed" && existingMaintenance.ends_at
        ? existingMaintenance.ends_at
        : new Date().toISOString()
      : endsAt;
    if (status === "completed" && completedAt && Date.parse(startsAt) > Date.parse(completedAt)) {
      return json({ error: "A future maintenance cannot be marked completed before it starts." }, 409);
    }
    if (status !== "completed" && endsAt && Date.parse(endsAt) < Date.parse(startsAt)) {
      return json({ error: "The end time must be after the start time." }, 400);
    }
    const values = {
      title, subtitle, message, affected_services: affectedServices, status,
      starts_at: startsAt, ends_at: completedAt, updated_at: new Date().toISOString(),
      ...(update ? {} : { created_by_email: user.email ?? null }),
    };
    let query = update
      ? admin.from("tic_status_maintenance").update(values).eq("id", id)
      : admin.from("tic_status_maintenance").insert(values);
    if (update && status === "completed" && existingMaintenance) query = query.eq("status", existingMaintenance.status);
    const { data, error } = await query.select("id,title,subtitle,message,affected_services,status,starts_at,ends_at,created_at,updated_at").maybeSingle();
    if (error) return json({ error: error.code === "23503" ? "This notice could not be saved." : "Maintenance could not be saved. Check the schedule and try again." }, 400);
    if (update && !data) return json({ error: "This maintenance changed while you were editing it. Reload and try again." }, 409);
    return json({ item: data });
  }

  if (input.kind === "blog") {
    const title = text(input.title, 180);
    const subtitle = text(input.subtitle, 320);
    const category = text(input.category, 80);
    const body = text(input.body, 50000);
    const rawSlug = typeof input.slug === "string" && input.slug.trim() ? input.slug.trim() : title ?? "";
    const slug = slugify(rawSlug);
    const status = typeof input.status === "string" ? input.status : "";
    if (!title || !subtitle || !category || !body || !slug || !postStates.has(status)) {
      return json({ error: "Add a title, subtitle, category, article text, and publishing state." }, 400);
    }
    const builtIn = builtInArticles.some(article => article.slug === slug);
    if (builtIn) return json({ error: "That URL is already used by a Field Notes article." }, 409);
    const publishedAt = status === "published"
      ? (typeof input.publishedAt === "string" && Number.isFinite(Date.parse(input.publishedAt)) ? new Date(input.publishedAt).toISOString() : new Date().toISOString())
      : null;
    const values = {
      title, subtitle, category, body, slug, status, published_at: publishedAt, updated_at: new Date().toISOString(),
      ...(update ? {} : { created_by_email: user.email ?? null }),
    };
    const query = update
      ? admin.from("tic_blog_posts").update(values).eq("id", id)
      : admin.from("tic_blog_posts").insert(values);
    const { data, error } = await query.select("id,slug,title,subtitle,category,body,status,published_at,created_at,updated_at").single();
    if (error) return json({ error: error.code === "23505" ? "That article URL is already in use." : "Field Notes could not be saved. Check the fields and try again." }, 400);
    return json({ item: data });
  }

  return json({ error: "Choose maintenance or Field Notes content." }, 400);
}
