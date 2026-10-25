import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("API Explorer exposes endpoint-specific parameter and authorization reference", async () => {
  const explorer = await readFile(new URL("app/developers/console/explorer.tsx", root), "utf8");
  const styles = await readFile(new URL("app/developers/tidelight-developers.css", root), "utf8");
  assert.match(explorer, /aria-labelledby="tic-reference-title"/);
  assert.match(explorer, /<code>limit<\/code>/);
  assert.match(explorer, /1–100 results per page/);
  assert.match(explorer, /<code>underlying_ticker<\/code>/);
  assert.match(explorer, /<code>cursor<\/code>/);
  assert.match(explorer, /<code>ticker<\/code>/);
  assert.match(explorer, /<code>Idempotency-Key<\/code>/);
  assert.match(explorer, /keeps this key for retries/);
  assert.match(explorer, /researchIdempotencyKey \|\| crypto\.randomUUID\(\)/);
  assert.match(explorer, /idempotencyKey \}\) \}\);/);
  assert.match(explorer, /Generate new key/);
  assert.match(explorer, /import \{ randomUUID \} from "node:crypto"/);
  assert.match(explorer, /idempotencyKey = randomUUID\(\); \/\/ create once per job and reuse for retries/);
  assert.match(explorer, /from uuid import uuid4/);
  assert.match(explorer, /idempotency_key = str\(uuid4\(\)\).*reuse for retries/);
  assert.match(explorer, /setResearchIdempotencyKey\(""\)/);
  assert.match(explorer, /useEffect\(\(\) => \{\s*if \(endpoint === "research" && !researchIdempotencyKey\) setResearchIdempotencyKey\(crypto\.randomUUID\(\)\)/);
  assert.match(explorer, /Its required scope is <code>\{scope\}<\/code>/);
  assert.match(styles, /\.tic-explorer-reference/);
  assert.match(styles, /@media\(max-width:520px\).*\.tic-explorer-reference dl>div\{grid-template-columns:1fr/s);
});
