import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("public capsule viewer is no-login, no-index, and only loads the public projection", async () => {
  const [page, viewer, share, support] = await Promise.all([
    readFile(new URL("app/capsule/public/[token]/page.tsx", root), "utf8"),
    readFile(new URL("app/ui/public-capsule-viewer.tsx", root), "utf8"),
    readFile(new URL("app/ui/agent-flow-desk.tsx", root), "utf8"),
    readFile(new URL("app/ui/support-companion.tsx", root), "utf8"),
  ]);
  assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false\s*\}/);
  assert.match(viewer, /fetch\(`\/api\/decision-capsules\/public\/\$\{token\}`/);
  assert.match(viewer, /verifyPublicCapsulePublication\(value\)/);
  assert.match(viewer, /verifyPublicCapsulePublication\(value\)/);
  assert.match(viewer, /setError\("unverified"\)/);
  assert.match(viewer, /Capsule could not be verified/);
  assert.match(page, /PublicCapsuleViewer key=\{token\} token=\{token\}/);
  assert.match(viewer, /claim\.stance === "supports" \? "Supports" : claim\.stance === "contradicts" \? "Challenges" : "Context"/);
  assert.match(viewer, /forecasts\.get\(forecastSequence\)/);
  assert.match(viewer, /event\.forecastSequence/);
  assert.match(viewer, /instrumentType === "us_equity"/);
  assert.match(viewer, /instrumentType === "reality_token"/);
  assert.match(viewer, /instrumentType === "us_stock_perpetual"/);
  assert.match(viewer, /Source link redacted/);
  assert.match(viewer, /sourceUrlRedacted/);
  assert.match(viewer, /payload\.sourceUrl : payload\.referenceSourceUrl/);
  assert.match(viewer, /payload\.sourceTimestamp : payload\.referenceSourceTimestamp/);
  assert.match(viewer, /Claim support and truth have not been independently verified/);
  assert.match(viewer, /publicSourceUrl\(claim\.sourceUrl\)/);
  assert.match(viewer, /formatPublicCapsulePrice\(payload\.observedPrice\)/);
  assert.match(viewer, /formatPublicCapsulePrice\(payload\.referencePrice\)/);
  assert.match(viewer, /payload\.forecastMet \? "Met" : "Not met"/);
  assert.match(support, /pathname\.startsWith\("\/capsule\/public\/"\)/);
  const quickActions = await readFile(new URL("app/ui/product-quick-actions.tsx", root), "utf8");
  assert.match(quickActions, /!publicCapsule \? <button type="button" onClick=\{askForHelp\}/);
  assert.match(viewer, /direction === "up" \? translate\("Up"\) : direction === "down" \? translate\("Down"\)/);
  assert.match(viewer, /directionLabel\(referencedForecast\.direction\)/);
  assert.match(viewer, /directionLabel\(payload\.direction\)/);
  assert.match(viewer, /value\.what_would_change/);
  assert.match(viewer, /value\.upside/);
  assert.match(viewer, /value\.downside/);
  assert.match(viewer, /!assets\.length && !hasNarrative/);
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
  for (const key of ["Public record", "Decision Capsule", "Copy integrity verified", "Published", "SHA-256", "Download JSON", "Research", "Evidence", "No disclosed research summary.", "Upside", "Downside", "What would change", "Open source", "Open price source", "Source timestamp", "Claim support and truth have not been independently verified.", "Supports", "Challenges", "Context", "No evidence was included in this public copy.", "Forecast history", "Outcome", "Forecast", "Reference price", "Observed price", "Met", "Not met", "Reported by user", "Horizon", "No forecast history was included.", "Source link redacted", "Capsule unavailable", "Capsule could not be verified", "US equity", "Reality token", "US-stock perpetual", "Loading"]) {
    assert.ok(viewer.includes(key), `Public viewer must render ${key}`);
    assert.equal(typeof translations[key], "string", `Missing Simplified Chinese entry for ${key}`);
  }
});
