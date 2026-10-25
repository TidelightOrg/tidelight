import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("API Explorer keeps a small, non-persistent request history and restores prior responses", async () => {
  const explorer = await readFile(new URL("app/developers/console/explorer.tsx", root), "utf8");
  const styles = await readFile(new URL("app/developers/tidelight-developers.css", root), "utf8");
  assert.match(explorer, /type ExplorerHistoryEntry/);
  assert.match(explorer, /setHistory\(current => \[entry, \.\.\.current\]\.slice\(0, 6\)\)/);
  assert.match(explorer, /function showHistoryEntry\(entry: ExplorerHistoryEntry\)/);
  assert.match(explorer, /setResult\(entry\.result\)/);
  assert.match(explorer, /aria-labelledby="tic-history-title"/);
  assert.match(explorer, /History stays in memory for this page session/);
  assert.match(explorer, /setHistory\(\[\]\)/);
  assert.doesNotMatch(explorer, /localStorage|sessionStorage/);
  assert.match(styles, /\.tic-explorer-history-list/);
  assert.match(styles, /@media\(max-width:520px\).*\.tic-explorer-history-list li/s);
});
