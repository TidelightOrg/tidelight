export type DecisionCapsuleReceipt = {
  id: string;
  createdAt: string;
  integrityHash: string;
  hashAlgorithm: "sha256";
  schemaVersion: 1;
};

export type SavedDecisionCapsule = Pick<DecisionCapsuleReceipt, "id" | "createdAt" | "integrityHash"> & { question: string };
export type CapsulePublicationSelection = { research: boolean; evidence: boolean; events: boolean };
export type CapsulePublicationPreview = { preview: Record<string, unknown>; integrityHash: string };

export async function getSavedDecisionCapsules(fetcher: typeof fetch = fetch): Promise<SavedDecisionCapsule[]> {
  const response = await fetcher("/api/decision-capsules", { cache: "no-store", headers: { Accept: "application/json" } });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : "Private decision capsules could not be loaded.";
    throw new Error(message);
  }
  if (!payload || typeof payload !== "object" || !("integrity" in payload) || payload.integrity !== "valid" || !("capsules" in payload) || !Array.isArray(payload.capsules) || payload.capsules.length > 50) {
    throw new Error("Saved capsules returned an invalid response.");
  }
  return payload.capsules.map((capsule) => {
    if (!capsule || typeof capsule !== "object" || !("id" in capsule) || typeof capsule.id !== "string" || !(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(capsule.id))
      || !("createdAt" in capsule) || typeof capsule.createdAt !== "string" || !isStrictIsoTimestamp(capsule.createdAt)
      || !("integrityHash" in capsule) || typeof capsule.integrityHash !== "string" || !/^[a-f0-9]{64}$/i.test(capsule.integrityHash)
      || !("question" in capsule) || typeof capsule.question !== "string" || capsule.question.length > 500) {
      throw new Error("A saved capsule returned invalid details.");
    }
    return { id: capsule.id, createdAt: capsule.createdAt, integrityHash: capsule.integrityHash.toLowerCase(), question: capsule.question };
  });
}

export type DecisionCapsuleHistoryEvent = {
  id: string;
  sequence: number;
  type: "forecast" | "outcome";
  createdAt: string;
  payload: Record<string, unknown>;
};

function readApiError(payload: unknown, fallback: string) {
  return payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string" ? payload.error : fallback;
}

async function shareRequest(capsuleId: string, body?: Record<string, unknown>, fetcher: typeof fetch = fetch) {
  const response = await fetcher(`/api/decision-capsules/${encodeURIComponent(capsuleId)}/share`, {
    ...(body ? { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body) } : { headers: { Accept: "application/json" } }),
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload, "Capsule sharing is unavailable."));
  if (!payload || typeof payload !== "object") throw new Error("Capsule sharing returned an invalid response.");
  return payload as Record<string, unknown>;
}

export async function getCapsulePublicationStatus(capsuleId: string, fetcher: typeof fetch = fetch): Promise<{ published: false } | { published: true; createdAt: string; integrityHash: string }> {
  const payload = await shareRequest(capsuleId, undefined, fetcher);
  if (typeof payload.published !== "boolean") throw new Error("Capsule sharing returned an invalid status.");
  if (payload.published && (typeof payload.createdAt !== "string" || !isStrictIsoTimestamp(payload.createdAt) || typeof payload.integrityHash !== "string" || !/^[a-f0-9]{64}$/i.test(payload.integrityHash))) {
    throw new Error("Capsule sharing returned invalid publication details.");
  }
  return payload.published
    ? { published: true, createdAt: payload.createdAt as string, integrityHash: (payload.integrityHash as string).toLowerCase() }
    : { published: false };
}

export async function previewDecisionCapsuleShare(capsuleId: string, selection: CapsulePublicationSelection, fetcher: typeof fetch = fetch): Promise<CapsulePublicationPreview> {
  const payload = await shareRequest(capsuleId, { action: "preview", selection }, fetcher);
  if (!payload.preview || typeof payload.preview !== "object" || Array.isArray(payload.preview) || typeof payload.integrityHash !== "string" || !/^[a-f0-9]{64}$/.test(payload.integrityHash)) {
    throw new Error("Capsule sharing returned an invalid public preview.");
  }
  return { preview: payload.preview as Record<string, unknown>, integrityHash: payload.integrityHash };
}

export async function publishDecisionCapsuleShare(capsuleId: string, selection: CapsulePublicationSelection, expectedIntegrityHash: string, fetcher: typeof fetch = fetch) {
  const payload = await shareRequest(capsuleId, { action: "publish", selection, confirmed: true, expectedIntegrityHash }, fetcher);
  if (payload.published !== true || typeof payload.url !== "string" || !/^\/api\/decision-capsules\/public\/[A-Za-z0-9_-]{43}$/.test(payload.url)
    || typeof payload.createdAt !== "string" || !isStrictIsoTimestamp(payload.createdAt) || typeof payload.integrityHash !== "string" || !/^[a-f0-9]{64}$/.test(payload.integrityHash)) {
    throw new Error("Capsule sharing returned invalid public link details.");
  }
  return { url: payload.url, createdAt: payload.createdAt, integrityHash: payload.integrityHash };
}

export async function revokeDecisionCapsuleShare(capsuleId: string, fetcher: typeof fetch = fetch) {
  const payload = await shareRequest(capsuleId, { action: "revoke" }, fetcher);
  if (payload.revoked !== true) throw new Error("Capsule sharing returned an invalid revocation status.");
}

export async function getDecisionCapsuleEvents(capsuleId: string, fetcher: typeof fetch = fetch): Promise<DecisionCapsuleHistoryEvent[]> {
  const response = await fetcher(`/api/decision-capsules/${encodeURIComponent(capsuleId)}/events`, { cache: "no-store", headers: { Accept: "application/json" } });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload, "Capsule history could not be loaded."));
  if (!payload || typeof payload !== "object" || !("integrity" in payload) || payload.integrity !== "valid" || !("events" in payload) || !Array.isArray(payload.events) || payload.events.length > 500) {
    throw new Error("Capsule history did not pass verification.");
  }
  const events = payload.events as unknown[];
  if (events.some(event => !event || typeof event !== "object" || !("id" in event) || typeof event.id !== "string" || !("sequence" in event) || !Number.isSafeInteger(event.sequence) || !("type" in event) || !["forecast", "outcome"].includes(String(event.type)) || !("createdAt" in event) || typeof event.createdAt !== "string" || !Number.isFinite(Date.parse(event.createdAt)) || !("payload" in event) || !event.payload || typeof event.payload !== "object" || Array.isArray(event.payload))) {
    throw new Error("Capsule history contains an invalid event.");
  }
  return events as DecisionCapsuleHistoryEvent[];
}

export async function appendDecisionCapsuleEvent(capsuleId: string, event: Record<string, unknown>, fetcher: typeof fetch = fetch): Promise<DecisionCapsuleHistoryEvent> {
  const response = await fetcher(`/api/decision-capsules/${encodeURIComponent(capsuleId)}/events`, {
    method: "POST", cache: "no-store", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(event),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(readApiError(payload, "Capsule event could not be saved."));
  if (!payload || typeof payload !== "object" || !("integrity" in payload) || payload.integrity !== "valid" || !("event" in payload) || !payload.event || typeof payload.event !== "object") {
    throw new Error("Capsule event could not be verified.");
  }
  return payload.event as DecisionCapsuleHistoryEvent;
}

function isStrictIsoTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
  const year = Number(yearText), month = Number(monthText), day = Number(dayText);
  const hour = Number(hourText), minute = Number(minuteText), second = Number(secondText);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) return false;
  if (zone !== "Z") {
    const offsetHour = Number(zone.slice(1, 3)), offsetMinute = Number(zone.slice(4, 6));
    if (offsetHour > 23 || offsetMinute > 59) return false;
  }
  return Number.isFinite(Date.parse(value));
}

export async function createDecisionCapsule(researchRunId: string, fetcher: typeof fetch = fetch): Promise<DecisionCapsuleReceipt> {
  const response = await fetcher("/api/decision-capsules", {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ researchRunId }),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
      ? payload.error
      : "The private decision capsule could not be saved. Try again shortly.";
    throw new Error(message);
  }

  if (!payload || typeof payload !== "object" || !("integrity" in payload) || payload.integrity !== "valid" || !("capsule" in payload)) {
    throw new Error("The saved capsule did not include a valid integrity receipt.");
  }
  const capsule = payload.capsule;
  if (!capsule || typeof capsule !== "object" || !("id" in capsule) || typeof capsule.id !== "string" || !(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(capsule.id))
    || !("created_at" in capsule) || typeof capsule.created_at !== "string" || !isStrictIsoTimestamp(capsule.created_at)
    || !("integrity_hash" in capsule) || typeof capsule.integrity_hash !== "string" || !/^[a-f0-9]{64}$/i.test(capsule.integrity_hash)
    || !("hash_algorithm" in capsule) || capsule.hash_algorithm !== "sha256"
    || !("schema_version" in capsule) || capsule.schema_version !== 1) {
    throw new Error("The saved capsule returned an invalid integrity receipt.");
  }
  return {
    id: capsule.id,
    createdAt: capsule.created_at,
    integrityHash: capsule.integrity_hash.toLowerCase(),
    hashAlgorithm: "sha256",
    schemaVersion: 1,
  };
}
