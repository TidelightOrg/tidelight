export type DecisionCapsuleReceipt = {
  id: string;
  createdAt: string;
  integrityHash: string;
  hashAlgorithm: "sha256";
  schemaVersion: 1;
};

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
    || !("created_at" in capsule) || typeof capsule.created_at !== "string" || !Number.isFinite(Date.parse(capsule.created_at))
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
