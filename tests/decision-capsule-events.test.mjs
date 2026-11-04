import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "./decision-capsules") return { url: new URL("../lib/decision-capsules.ts", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });
const {
  buildCapsuleOutcomePayload,
  hashCapsuleEvent,
  parseCapsuleEventInput,
  verifyCapsuleEventChain,
} = await import("../lib/decision-capsule-events.ts");
hooks.deregister();

const anchor = "a".repeat(64);
const forecastId = "d475bd46-5035-4ae5-9f19-e2959a4f0734";
const capsuleId = "e475bd46-5035-4ae5-9f19-e2959a4f0734";
const ownerId = "f475bd46-5035-4ae5-9f19-e2959a4f0734";
const key = "0475bd46-5035-4ae5-9f19-e2959a4f0734";
const now = Date.parse("2026-11-04T00:00:00Z");

function row(event, user = ownerId) {
  return {
    id: event.id, capsule_id: event.capsuleId, user_id: user,
    sequence: event.sequence, event_type: event.type, idempotency_key: event.idempotencyKey,
    forecast_event_id: event.forecastEventId, payload: structuredClone(event.payload),
    previous_hash: event.previousHash, integrity_hash: event.integrityHash, created_at: event.createdAt,
  };
}

function chainEvents() {
  const parsed = parseCapsuleEventInput({
    idempotencyKey: key, type: "forecast", payload: {
      instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
      direction: "up", thresholdPercent: 5, horizonAt: "2026-11-05T00:00:00Z", probability: 0.7,
    },
  }, now);
  const unsignedForecast = {
    id: forecastId, capsuleId, sequence: 1, type: "forecast", idempotencyKey: key,
    forecastEventId: null, payload: parsed.payload, previousHash: anchor, createdAt: "2026-11-04T00:01:00.000Z",
  };
  const forecast = { ...unsignedForecast, integrityHash: hashCapsuleEvent(unsignedForecast) };
  const outcomeInput = parseCapsuleEventInput({
    idempotencyKey: "1475bd46-5035-4ae5-9f19-e2959a4f0734", type: "outcome", payload: {
      forecastEventId: forecastId, observedPrice: 106, observedAt: "2026-11-05T00:00:00Z",
      sourceUrl: "https://prices.example/nvda", sourceTimestamp: "2026-11-05T00:00:00Z",
    },
  }, now + 2 * 86_400_000);
  const payload = buildCapsuleOutcomePayload(forecast, outcomeInput.payload);
  const unsignedOutcome = {
    id: "2475bd46-5035-4ae5-9f19-e2959a4f0734", capsuleId, sequence: 2, type: "outcome",
    idempotencyKey: outcomeInput.idempotencyKey, forecastEventId: forecastId,
    payload, previousHash: forecast.integrityHash, createdAt: "2026-11-05T00:01:00.000Z",
  };
  const outcome = { ...unsignedOutcome, integrityHash: hashCapsuleEvent(unsignedOutcome) };
  return [forecast, outcome];
}

test("forecast inputs validate distinct instrument identities and preserve normalized values", () => {
  const parsed = parseCapsuleEventInput({
    idempotencyKey: key, type: "forecast", payload: {
      instrument: { type: "us_stock_perpetual", symbol: "NVDAUSDT" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
      direction: "down", thresholdPercent: 3, horizonAt: "2026-11-05T00:00:00Z",
    },
  }, now);
  assert.equal(parsed.type, "forecast");
  assert.equal(parsed.payload.instrument.type, "us_stock_perpetual");
  assert.equal(parsed.payload.referenceSourceUrl, "https://prices.example/nvda");
  assert.equal(parsed.payload.referenceReportedBy, "user");
  const upperUuid = parseCapsuleEventInput({
    idempotencyKey: key.toUpperCase(), type: "forecast", payload: {
      instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
      direction: "up", thresholdPercent: 1, horizonAt: "2026-11-05T00:00:00Z",
    },
  }, now);
  assert.equal(upperUuid.idempotencyKey, key);
  const upperOutcome = parseCapsuleEventInput({
    idempotencyKey: "1475bd46-5035-4ae5-9f19-e2959a4f0734".toUpperCase(), type: "outcome", payload: {
      forecastEventId: forecastId.toUpperCase(), observedPrice: 101, observedAt: "2026-11-05T00:00:00Z",
      sourceUrl: "https://prices.example/nvda", sourceTimestamp: "2026-11-05T00:00:00Z",
    },
  }, now + 2 * 86_400_000);
  assert.equal(upperOutcome.forecastEventId, forecastId);
  assert.equal(upperOutcome.payload.forecastEventId, forecastId);
  assert.throws(() => parseCapsuleEventInput({
    idempotencyKey: key, type: "forecast", payload: {
      instrument: { type: "toString", symbol: "NVDA" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
      direction: "up", thresholdPercent: 1, horizonAt: "2026-11-05T00:00:00Z",
    },
  }, now), /exact symbol/i);
  assert.throws(() => parseCapsuleEventInput({
    idempotencyKey: key, type: "forecast", payload: {
      instrument: { type: "us_equity", symbol: "nvda" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
      direction: "up", thresholdPercent: 1, horizonAt: "2026-11-05T00:00:00Z",
    },
  }, now), /exact symbol/i);
});

test("event payloads reject unknown fields, invalid probabilities, and unsafe outcome sources", () => {
  const base = { idempotencyKey: key, type: "forecast", payload: {
    instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
    direction: "up", thresholdPercent: 1, horizonAt: "2026-11-05T00:00:00Z",
  } };
  assert.throws(() => parseCapsuleEventInput({ ...base, extra: true }, now), /idempotency key/i);
  assert.throws(() => parseCapsuleEventInput({ ...base, payload: { ...base.payload, probability: 1.1 } }, now), /probability/i);
  const outcome = { idempotencyKey: key, type: "outcome", payload: {
    forecastEventId: forecastId, observedPrice: 101, observedAt: "2026-11-05T00:00:00Z",
    sourceUrl: "http://prices.example", sourceTimestamp: "2026-11-05T00:00:00Z",
  } };
  assert.throws(() => parseCapsuleEventInput(outcome, now), /HTTPS URL/i);
  assert.throws(() => parseCapsuleEventInput({ ...outcome, payload: { ...outcome.payload, sourceUrl: "https://user:secret@prices.example" } }, now), /HTTPS URL/i);
  assert.throws(() => parseCapsuleEventInput({ ...outcome, payload: { ...outcome.payload, sourceUrl: `https://prices.example/${"界".repeat(300)}` } }, now), /after normalization/i);
});

test("forecast reference provenance is required, normalized, timestamped, and explicitly user reported", () => {
  const base = { idempotencyKey: key, type: "forecast", payload: {
    instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100,
    referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z",
    direction: "up", thresholdPercent: 1, horizonAt: "2026-11-05T00:00:00Z",
  } };
  assert.equal(parseCapsuleEventInput(base, now).payload.referenceSourceTimestamp, "2026-11-04T00:00:00.000Z");
  assert.throws(() => parseCapsuleEventInput({ ...base, payload: { ...base.payload, referenceSourceUrl: "http://prices.example/nvda" } }, now), /HTTPS URL/i);
  assert.throws(() => parseCapsuleEventInput({ ...base, payload: { ...base.payload, referenceSourceTimestamp: "2026-11-05T00:00:00Z" } }, now), /cannot be in the future/i);
  assert.throws(() => parseCapsuleEventInput({ ...base, payload: { ...base.payload, referenceSourceUrl: undefined } }, now), /source URL is required/i);
});

test("outcome calculation is deterministic and explicitly based on reported observation", () => {
  const [forecast, outcome] = chainEvents();
  assert.ok(Math.abs(outcome.payload.actualReturnPercent - 6) < 1e-12);
  assert.equal(outcome.payload.forecastMet, true);
  assert.equal(outcome.payload.reportedBy, "user");
  assert.ok(Math.abs(outcome.payload.brierScore - 0.09) < 1e-12);
  assert.deepEqual(verifyCapsuleEventChain(capsuleId, anchor, [row(forecast), row(outcome)]), [forecast, outcome]);
});

test("hash-chain verification rejects changed payloads, skipped sequence, and orphan outcomes", () => {
  const events = chainEvents();
  assert.equal(verifyCapsuleEventChain(capsuleId, anchor, [row(events[0], "not-a-uuid"), row(events[1])]), null);
  const altered = row(events[0]); altered.payload.referencePrice = 101;
  assert.equal(verifyCapsuleEventChain(capsuleId, anchor, [altered, row(events[1])]), null);
  const skipped = row(events[1]); skipped.sequence = 3;
  assert.equal(verifyCapsuleEventChain(capsuleId, anchor, [row(events[0]), skipped]), null);
  assert.equal(verifyCapsuleEventChain(capsuleId, anchor, [row(events[1])]), null);
  assert.equal(verifyCapsuleEventChain(capsuleId, "invalid", []), null);
});

test("outcome scoring rejects non-forecast and mismatched forecast identities", () => {
  const [forecast, outcome] = chainEvents();
  assert.throws(() => buildCapsuleOutcomePayload(outcome, outcome.payload), /not a forecast/i);
  assert.throws(() => buildCapsuleOutcomePayload(forecast, { ...outcome.payload, forecastEventId: ownerId }), /identity does not match/i);
});

test("threshold outcomes use a floating-point-safe price boundary", () => {
  const forecast = {
    id: forecastId, capsuleId, sequence: 1, type: "forecast", idempotencyKey: key,
    forecastEventId: null,
    payload: { instrument: { type: "us_equity", symbol: "NVDA" }, referencePrice: 100, referenceSourceUrl: "https://prices.example/nvda", referenceSourceTimestamp: "2026-11-04T00:00:00Z", direction: "up", thresholdPercent: 20, horizonAt: "2026-11-05T00:00:00.000Z", probability: 0.9 },
    previousHash: anchor, integrityHash: "b".repeat(64), createdAt: "2026-11-04T00:01:00.000Z",
  };
  const outcome = buildCapsuleOutcomePayload(forecast, {
    forecastEventId: forecastId, observedPrice: 120, observedAt: "2026-11-05T00:00:00.000Z",
    sourceUrl: "https://prices.example/nvda", sourceTimestamp: "2026-11-05T00:00:00.000Z",
  });
  assert.equal(outcome.forecastMet, true);
  assert.ok(Math.abs(outcome.brierScore - 0.01) < 1e-12);

  const tinyForecast = { ...forecast, payload: { ...forecast.payload, referencePrice: 1e-8, thresholdPercent: 0.000001, probability: 0.9 } };
  const unchangedPrice = buildCapsuleOutcomePayload(tinyForecast, {
    forecastEventId: forecastId, observedPrice: 1e-8, observedAt: "2026-11-05T00:00:00.000Z",
    sourceUrl: "https://prices.example/nvda", sourceTimestamp: "2026-11-05T00:00:00.000Z",
  });
  assert.equal(unchangedPrice.forecastMet, false);
  assert.ok(Math.abs(unchangedPrice.brierScore - 0.81) < 1e-12);
});
