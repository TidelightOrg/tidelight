import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("API Explorer exposes endpoint-specific parameter and authorization reference", async () => {
  const explorer = await readFile(new URL("app/developers/console/explorer.tsx", root), "utf8");
  const styles = await readFile(new URL("app/developers/tidelight-developers.css", root), "utf8");
  const market = explorer.slice(explorer.indexOf("endpoint === \"market\" ? <>"), explorer.indexOf("</> : <>"));
  const research = explorer.slice(explorer.indexOf("</> : <>"), explorer.indexOf("</>}", explorer.indexOf("</> : <>")));

  assert.match(explorer, /aria-labelledby="tic-reference-title"/);
  assert.match(market, /<code>limit<\/code>/);
  assert.match(market, /1–100 results per page/);
  assert.match(market, /<code>underlying_ticker<\/code>/);
  assert.match(market, /<code>cursor<\/code>/);
  assert.match(research, /<code>ticker<\/code>/);
  assert.match(research, /<code>Idempotency-Key<\/code>/);
  assert.match(research, /generates a fresh key for each submission/);
  assert.match(explorer, /Its required scope is <code>\{scope\}<\/code>/);
  assert.match(styles, /\.tic-explorer-reference/);
  assert.match(styles, /@media\(max-width:520px\).*\.tic-explorer-reference dl>div\{grid-template-columns:1fr/s);
});
