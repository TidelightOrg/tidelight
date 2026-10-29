import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderAttempt } from "@/lib/ai-fallback";

/** Persist at most six metadata-only attempts; abort the write after 1.5 seconds to protect research saves. */
export async function recordProviderHealth(attempts: ProviderAttempt[]) {
  if (!attempts.length) return;
  try {
    const admin = createAdminClient();
    const rows = attempts.slice(0, 6).map(({ provider, model, attempt, outcome, durationMs, httpStatus }) => ({
      provider,
      model: model.slice(0, 80),
      attempt,
      outcome,
      duration_ms: Math.max(0, Math.min(120_000, Math.round(durationMs))),
      ...(httpStatus === undefined ? {} : { http_status: httpStatus }),
    }));
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 1_500);
    try {
      const { error } = await admin
        .from("research_provider_health_events")
        .insert(rows)
        .abortSignal(controller.signal);
      if (error) console.warn("provider-health-write-unavailable", error.code);
    } finally {
      clearTimeout(deadline);
    }
  } catch {
    // Operations telemetry must never prevent a user's research result from saving.
    console.warn("provider-health-write-unavailable");
  }
}
