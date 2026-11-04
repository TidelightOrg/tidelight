import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public capsule viewer is no-login, no-index, and only loads the public projection", async () => {
  const [page, viewer, share] = await Promise.all([
    readFile(new URL("app/capsule/public/[token]/page.tsx", root), "utf8"),
    readFile(new URL("app/ui/public-capsule-viewer.tsx", root), "utf8"),
    readFile(new URL("app/ui/agent-flow-desk.tsx", root), "utf8"),
  ]);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(viewer, /fetch\(`\/api\/decision-capsules\/public\/\$\{token\}`/);
  assert.match(viewer, /integrity !== "valid"/);
  assert.match(viewer, /verifyPublicCapsuleDigest\(value\.snapshot, value\.integrityHash\)/);
  assert.match(viewer, /claim\.stance === "supports" \? "Supports" : claim\.stance === "contradicts" \? "Challenges" : "Context"/);
  assert.match(viewer, /forecasts\.get\(forecastSequence\)/);
  assert.match(viewer, /event\.forecastSequence/);
  assert.match(viewer, /Source link redacted/);
  assert.match(viewer, /sourceUrlRedacted/);
  assert.match(viewer, /direction === "up" \? translate\("Up"\) : direction === "down" \? translate\("Down"\)/);
  assert.match(viewer, /directionLabel\(referencedForecast\.direction\)/);
  assert.match(viewer, /directionLabel\(payload\.direction\)/);
  assert.match(viewer, /\?download=1/);
  assert.doesNotMatch(viewer, /getServerAuthState|createAdminClient|supabase/);
  assert.match(share, /function publicViewerUrl\(apiUrl: string\)/);
  assert.match(share, /href=\{publicViewerUrl\(shareUrl\)\}/);
});

test("public capsule view copy has Simplified Chinese translations", async () => {
  const [viewer, translations] = await Promise.all([
    readFile(new URL("app/ui/public-capsule-viewer.tsx", root), "utf8"),
    readFile(new URL("app/i18n/zh-CN.json", root), "utf8").then(JSON.parse),
  ]);
  for (const key of ["Public record", "Decision Capsule", "Integrity verified", "Published", "SHA-256", "Download JSON", "Research", "Evidence", "No disclosed research summary.", "Open source", "Supports", "Challenges", "Context", "No evidence was included in this public copy.", "Forecast history", "Outcome", "Forecast", "Reference price", "Observed price", "Reported by user", "Horizon", "No forecast history was included.", "Source link redacted", "Capsule unavailable", "Loading"]) {
    assert.ok(viewer.includes(key), `Public viewer must render ${key}`);
    assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
  }
});
