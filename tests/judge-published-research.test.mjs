import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("Judge Mode promotes live owner-published research instead of the static fixture", async () => {
  const page = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  for (const token of ["c5f5b22e-c995-4a5e-8193-5737c4d413b8", "4e86bf9c-7295-4be1-ae52-487341e7f1ca", "5d27e66c-2a87-4450-95d3-5014e1309216", "7ca56a20-c064-4f99-b351-806b2ddd685e", "c67d7b29-85eb-4c27-8a29-2cbe85bd4e91", "c2ffbe89-74a5-4547-bf89-5952e37efeaa", "91bb478a-7977-4b34-b32d-b1f558a8af75"]) {
    assert.ok(page.includes(token), `Judge page is missing replay ${token}`);
  }
  assert.doesNotMatch(page, /href=["']\/replay["']/);
  assert.match(page, /AI synthesis was unavailable/i);
  assert.match(page, /href="\/strategies"/);
  assert.match(page, /No public strategy replay is linked here/);
  assert.match(page, /nightwatch-rnvd-position\.png/);
  assert.match(page, /nightwatch-raapl-position\.png/);
  assert.match(page, /nightwatch-rgoogl-position\.png/);
  assert.match(page, /nightwatch-rnvdusdt-email\.jpeg/);
  assert.match(page, /nightwatch-email-delivery\.json/);
  assert.match(page, /Notification received for RNVDUSDT/);
  assert.match(page, /href="\/evidence\/nightwatch-position-captures\.json"/);
  assert.match(page, /href="\/nightwatch\/replays"/);
});

test("README separates live judge research from the link directory and data exports", async () => {
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const judge = readme.indexOf("## Judge review · public evidence");
  const links = readme.indexOf("## Judge links · Tidelight ecosystem");
  const data = readme.indexOf("## Research data and trading artifacts");
  assert.ok(judge >= 0 && judge < links);
  assert.ok(data >= 0 && data < links);
  assert.match(readme, /\[JSON\]\(https:\/\/tidelight\.app\/api\/research\/replays\//);
  assert.match(readme, /AI synthesis unavailable/);
  assert.match(readme, /Open Nightwatch position captures/);
  assert.match(readme, /nightwatch-position-captures\.json/);
  assert.match(readme, /nightwatch-rnvd-position\.png/);
  assert.match(readme, /Nightwatch email delivery evidence/);
  assert.match(readme, /nightwatch-rnvdusdt-email\.jpeg/);
  assert.match(readme, /nightwatch-email-delivery\.json/);
});

test("Gmail delivery evidence is linked publicly without mailbox identifiers", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8"));
  const evidence = JSON.parse(await readFile(new URL("../public/evidence/nightwatch-email-delivery.json", import.meta.url), "utf8"));
  const page = await readFile(new URL("../app/judge/page.tsx", import.meta.url), "utf8");
  const readme = await readFile(new URL("../README.md", import.meta.url), "utf8");
  const row = manifest.evidence_inventory.find((item) => item.id === "nightwatch-email-delivery-rnvdusdt");
  assert.equal(row.status, "gmail_message_verified_static_capture");
  assert.equal(evidence.instrument, "RNVDUSDT");
  assert.equal(evidence.local_time, "2026-10-24T09:00:13+01:00");
  assert.deepEqual(evidence.mail_authentication, { spf: "pass", dkim: "pass", dmarc: "pass" });
  assert.ok(evidence.limitations.length >= 3);
  assert.doesNotMatch(JSON.stringify(evidence), /muhammadabdulhameed|1a16cecb3995d65e/);
  assert.match(page, /id="nightwatch-email-delivery"/);
  assert.match(readme, /<summary><strong>Nightwatch email delivery evidence/);
  await readFile(new URL("../public/judge-evidence/nightwatch-rnvdusdt-email.jpeg", import.meta.url));
});

test("evidence manifest lists the seven owner-published judge replays and their limits", async () => {
  const source = await readFile(new URL("../public/evidence/manifest.json", import.meta.url), "utf8");
  const manifest = JSON.parse(source);
  assert.equal(manifest.owner_published_research.replays.length, 7);
  assert.equal(manifest.owner_published_research.expires_after_days, 30);
  assert.equal(manifest.owner_published_research.replays.filter((run) => run.ai_synthesis === "unavailable").length, 5);
});
