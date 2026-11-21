import "server-only";
import { getProviderRoutingDecision, type ProviderRoutingDecision } from "./provider-health";

type Message = { role: string; content: string };
export type Provider = { label: "qwen" | "gemini"; endpoint: string; model: string; key: string };

export function configuredAiProviders(): Provider[] {
  const providers: Provider[] = [];
  const qwenKey = (process.env.BITGET_QWEN_API_KEY ?? "").trim().replace(/^Bearer\s+/i, "");
  const qwenModel = (process.env.BITGET_QWEN_MODEL ?? "").trim();
  const rawBase = process.env.BITGET_QWEN_BASE_URL?.trim() || "https://hackathon.bitgetops.com/v1";
  try {
    const base = new URL(rawBase);
    if (qwenKey && /^[a-zA-Z0-9._:-]{1,80}$/.test(qwenModel) && base.protocol === "https:" && base.hostname === "hackathon.bitgetops.com" && !base.username && !base.password && !base.search && !base.hash && base.pathname.replace(/\/+$/, "") === "/v1") {
      providers.push({ label: "qwen", endpoint: base.origin + "/v1/chat/completions", model: qwenModel, key: qwenKey });
    }
  } catch { }
  const geminiKey = (process.env.GEMINI_API_KEY ?? "").trim().replace(/^Bearer\s+/i, "");
  const geminiModel = (process.env.GEMINI_MODEL ?? "").trim();
  if (geminiKey && /^[a-zA-Z0-9._:-]{1,80}$/.test(geminiModel)) {
    providers.push({ label: "gemini", endpoint: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`, model: geminiModel, key: geminiKey });
  }
  return providers;
}

function jsonObject(raw: string): Record<string, unknown> | null {
  try {
    const clean = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(clean);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export type AiRequestOptions = {
  budgetMs?: number;
  deadlineAt?: number;
  provider?: Provider["label"];
  healthAware?: boolean;
  onProviderRouting?: (decision: ProviderRoutingDecision) => void;
  onSuccess?: (provider: { label: Provider["label"]; model: string }) => void;
  onAttempt?: (attempt: ProviderAttempt) => void;
};

export type ProviderAttempt = {
  provider: Provider["label"];
  model: string;
  attempt: number;
  outcome: "success" | "http_error" | "invalid_response" | "timeout" | "network_error";
  occurredAt: string;
  durationMs: number;
  httpStatus?: number;
};

function reportAttempt(callback: AiRequestOptions["onAttempt"], attempt: ProviderAttempt) {
  try { callback?.(attempt); } catch { }
}

type AiPayload = {
  choices?: Array<{ finish_reason?: string; message?: { content?: string | null } }>;
  candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  promptFeedback?: { blockReason?: string };
};

function responseText(payload: AiPayload, nativeGemini: boolean): string {
  if (nativeGemini) {
    if (payload.promptFeedback?.blockReason && payload.promptFeedback.blockReason !== "BLOCK_REASON_UNSPECIFIED") return "";
    const candidate = payload.candidates?.[0];
    if (candidate?.finishReason && !["STOP", "MAX_TOKENS"].includes(candidate.finishReason)) return "";
    return (candidate?.content?.parts ?? []).filter(part => !part.thought && typeof part.text === "string").map(part => part.text).join("");
  }
  const choice = payload.choices?.[0];
  if (choice?.finish_reason && !["stop", "length"].includes(choice.finish_reason)) return "";
  return typeof choice?.message?.content === "string" ? choice.message.content : "";
}

export async function aiJsonWithFallback(messages: Message[], valid: (value: Record<string, unknown>) => boolean, options: AiRequestOptions = {}) {
  let providers = configuredAiProviders().filter(provider => !options.provider || provider.label === options.provider);
  if (!providers.length) throw new Error("ai-not-configured");
  if (options.healthAware && providers.length > 1) {
    const routing = await getProviderRoutingDecision(providers.map(provider => provider.label));
    try { options.onProviderRouting?.(routing); } catch { }
    const skipped = new Set(routing.skippedProviders.map(item => item.provider));
    if (skipped.size && skipped.size < providers.length) providers = providers.filter(provider => !skipped.has(provider.label));
  }
  const budgetMs = Number.isFinite(options.budgetMs) ? Math.max(0, Math.min(options.budgetMs!, 45000)) : 20000;
  const deadlineAt = Math.min(Date.now() + budgetMs, Number.isFinite(options.deadlineAt) ? options.deadlineAt! : Infinity);
  const failures: string[] = [];
  let latestAttemptTimestamp = 0;
  for (const [index, provider] of providers.entries()) {
    const remaining = deadlineAt - Date.now();
    if (remaining <= 0) break;
    const providerDeadline = index < providers.length - 1
      ? Math.min(deadlineAt, Date.now() + (remaining >= 30000 ? Math.min(16000, remaining - 22000) : Math.min(12000, Math.floor(remaining / 3))))
      : deadlineAt;
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptStartedAt = Date.now();
      let reported = false;
      const report = (outcome: ProviderAttempt["outcome"], httpStatus?: number) => {
        if (reported) return;
        reported = true;
        latestAttemptTimestamp = Math.max(Date.now(), latestAttemptTimestamp + 1);
        reportAttempt(options.onAttempt, { provider: provider.label, model: provider.model, attempt: attempt + 1, outcome, occurredAt: new Date(latestAttemptTimestamp).toISOString(), durationMs: Math.max(0, Date.now() - attemptStartedAt), ...(httpStatus === undefined ? {} : { httpStatus }) });
      };
      const nativeGemini = provider.label === "gemini";
      const timeoutMs = Math.min(providerDeadline - Date.now(), attempt === 0 ? (nativeGemini ? 22000 : 16000) : 9000);
      if (timeoutMs <= 0) { report("timeout"); break; }
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timedOut = new Promise<never>((_, reject) => {
          timer = setTimeout(() => {
            const error = new DOMException("AI request timed out", "TimeoutError");
            controller.abort(error);
            reject(error);
          }, timeoutMs);
        });
        const request = async () => {
          const response = await fetch(provider.endpoint, {
            method: "POST",
            headers: nativeGemini
              ? { "x-goog-api-key": provider.key, "x-goog-api-client": "tidelight-research/1.0", "Content-Type": "application/json" }
              : { Authorization: `Bearer ${provider.key}`, "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify(nativeGemini ? {
              ...(messages.some(message => message.role === "system") ? { systemInstruction: { parts: messages.filter(message => message.role === "system").map(message => ({ text: message.content })) } } : {}),
              contents: messages.filter(message => message.role !== "system").map(message => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] })),
              generationConfig: {
                responseMimeType: "application/json",
                ...(provider.model.startsWith("gemini-3") ? {
                  thinkingConfig: { thinkingLevel: provider.model.includes("flash-lite") ? "minimal" : "low" },
                } : { temperature: 0.15 }),
              },
            } : { model: provider.model, temperature: 0.15, enable_thinking: false, response_format: { type: "json_object" }, messages }),
          });
          if (!response.ok) {
            await discardProviderErrorBody(response);
            console.warn("ai-provider-http", { provider: provider.label, model: provider.model, status: response.status, detail: safeProviderError() });
            return { response, payload: null };
          }
          return { response, payload: await response.json() as AiPayload };
        };
        const { response, payload } = await Promise.race([request(), timedOut]);
        if (Date.now() >= providerDeadline) throw new DOMException("AI request timed out", "TimeoutError");
        if (!response.ok) {
          report("http_error", response.status);
          failures.push(`${provider.label}-http-${response.status}`);
          if (attempt === 0 && [429, 500, 502, 503, 504].includes(response.status)) continue;
          break;
        }
        const output = payload ? responseText(payload, nativeGemini) : "";
        const parsed = jsonObject(output);
        if (parsed && valid(parsed)) { report("success"); options.onSuccess?.({ label: provider.label, model: provider.model }); return parsed; }
        report("invalid_response");
        console.warn("ai-provider-invalid", {
          provider: provider.label,
          model: provider.model,
          finish: nativeGemini ? payload?.candidates?.[0]?.finishReason ?? "missing" : payload?.choices?.[0]?.finish_reason ?? "missing",
          candidates: nativeGemini ? payload?.candidates?.length ?? 0 : payload?.choices?.length ?? 0,
          outputLength: output.length,
          jsonParsed: Boolean(parsed),
        });
        failures.push(`${provider.label}-invalid-response`);
        if (attempt === 0 && timeoutMs > 9000) continue;
        break;
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "TimeoutError";
        report(timedOut ? "timeout" : "network_error");
        failures.push(`${provider.label}-${timedOut ? "timeout" : "network-error"}`);
        break;
      } finally {
        if (!reported) report("network_error");
        clearTimeout(timer);
      }
    }
  }
  if (Date.now() >= deadlineAt) failures.push("ai-budget-exhausted");
  throw new Error(failures.join(",") || "ai-unavailable");
}

export function safeProviderError(): string {
  return "Provider returned a non-success response.";
}

export async function discardProviderErrorBody(response: Pick<Response, "body">): Promise<void> {
  try { await response.body?.cancel(); } catch { }
}
