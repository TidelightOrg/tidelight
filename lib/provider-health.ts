import { createAdminClient } from "@/lib/supabase/admin";
import type { ProviderAttempt } from "@/lib/ai-fallback";

export type ProviderHealthLabel = "qwen" | "gemini";
export type ProviderHealthEvent = { provider: ProviderHealthLabel; outcome: ProviderAttempt["outcome"]; occurred_at: string };
export type ProviderRoutingDecision = {
  status: "available" | "unavailable" | "all_open_probe";
  skippedProviders: Array<{ provider: ProviderHealthLabel; consecutiveFailures: number; retryAfter: string }>;
};

export const PROVIDER_CIRCUIT_FAILURE_THRESHOLD = 3;
export const PROVIDER_CIRCUIT_FAILURE_WINDOW_MS = 120_000;
export const PROVIDER_CIRCUIT_COOLDOWN_MS = 60_000;
export const PROVIDER_HEALTH_READ_TIMEOUT_MS = 300;

/** Apply only a short circuit from recent operational events; this never labels a provider healthy. */
export function classifyProviderRouting(
  providers: ProviderHealthLabel[],
  events: ProviderHealthEvent[],
  now = Date.now(),
): ProviderRoutingDecision {
  const cutoff = now - PROVIDER_CIRCUIT_FAILURE_WINDOW_MS;
  const skippedProviders: ProviderRoutingDecision["skippedProviders"] = [];
  for (const provider of providers) {
    const recent = events
      .filter((event) => event.provider === provider && Number.isFinite(Date.parse(event.occurred_at)) && Date.parse(event.occurred_at) >= cutoff && Date.parse(event.occurred_at) <= now)
      .sort((a, b) => Date.parse(b.occurred_at) - Date.parse(a.occurred_at));
    let consecutiveFailures = 0;
    for (const event of recent) {
      if (event.outcome === "success") break;
      consecutiveFailures++;
    }
    const latest = recent[0];
    const retryAt = latest ? Date.parse(latest.occurred_at) + PROVIDER_CIRCUIT_COOLDOWN_MS : 0;
    if (consecutiveFailures >= PROVIDER_CIRCUIT_FAILURE_THRESHOLD && retryAt > now) {
      skippedProviders.push({ provider, consecutiveFailures, retryAfter: new Date(retryAt).toISOString() });
    }
  }
  // If every configured provider appears impaired, retain the ordinary bounded
  // Qwen→Gemini fallback as a half-open recovery probe instead of hard-failing.
  return {
    status: skippedProviders.length === providers.length && providers.length > 0 ? "all_open_probe" : "available",
    skippedProviders: skippedProviders.length === providers.length ? [] : skippedProviders,
  };
}

/** Read a small, recent metadata window. On telemetry failure, callers keep the configured provider order. */
export async function getProviderRoutingDecision(providers: ProviderHealthLabel[], now = Date.now()): Promise<ProviderRoutingDecision> {
  if (providers.length < 2) return { status: "available", skippedProviders: [] };
  try {
    const admin = createAdminClient();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROVIDER_HEALTH_READ_TIMEOUT_MS);
    try {
      const rows = await Promise.all(providers.map(provider => admin.from("research_provider_health_events")
        .select("provider,outcome,occurred_at")
        .eq("provider", provider)
        .gte("occurred_at", new Date(now - PROVIDER_CIRCUIT_FAILURE_WINDOW_MS).toISOString())
        .order("occurred_at", { ascending: false })
        .limit(10)
        .abortSignal(controller.signal)));
      if (rows.some(({ error, data }) => error || !Array.isArray(data))) return { status: "unavailable", skippedProviders: [] };
      return classifyProviderRouting(providers, rows.flatMap(({ data }) => data as ProviderHealthEvent[]), now);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return { status: "unavailable", skippedProviders: [] };
  }
}

/** Persist at most six metadata-only attempts; abort the write after 1.5 seconds to protect research saves. */
export async function recordProviderHealth(attempts: ProviderAttempt[]) {
  if (!attempts.length) return;
  try {
    const admin = createAdminClient();
    const rows = attempts.slice(0, 6).map(({ provider, model, attempt, outcome, occurredAt, durationMs, httpStatus }) => ({
      occurred_at: occurredAt,
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
