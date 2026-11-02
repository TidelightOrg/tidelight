import test from "node:test";
import assert from "node:assert/strict";
import { JUDGE_SESSION_KEY, storeJudgeResult, clearJudgeResult } from "../lib/judge-session.ts";

test("judge session storage reports successful persistence and deletion", t => {
  const previous = globalThis.sessionStorage;
  t.after(() => { if (previous === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous; });
  const values = new Map();
  globalThis.sessionStorage = { setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  assert.equal(storeJudgeResult({ guestSessionResult: true, question: "NVDA" }), true);
  assert.equal(JSON.parse(values.get(JUDGE_SESSION_KEY)).question, "NVDA");
  assert.equal(clearJudgeResult(), true);
  assert.equal(values.has(JUDGE_SESSION_KEY), false);
});

test("blocked or oversized browser storage is reported without disrupting research", t => {
  const previous = globalThis.sessionStorage;
  t.after(() => { if (previous === undefined) delete globalThis.sessionStorage; else globalThis.sessionStorage = previous; });
  globalThis.sessionStorage = { setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(storeJudgeResult({ question: "NVDA" }), false);
  assert.equal(clearJudgeResult(), false);
  assert.equal(storeJudgeResult({ data: "x".repeat(1_500_000) }), false);
});

test("judge result display distinguishes storage failure and offers a clear action", async () => {
  const { readFile } = await import("node:fs/promises");
  const page = await readFile(new URL("../app/ui/agent-flow-desk.tsx", import.meta.url), "utf8");
  assert.match(page, /data\.guestSessionResult === true && storeJudgeResult\(data\)/);
  assert.match(page, /Browser storage is unavailable or the result is too large/);
  assert.match(page, /Clear this result/);
  assert.match(page, /setResult\(null\)/);
});
