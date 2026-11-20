import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { commentKey, inventoryComments } from "./comment-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baselinePath = path.join(root, "config/comment-baseline.json");
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const current = inventoryComments(root);

function countsOf(comments) {
  const counts = new Map();
  for (const comment of comments) {
    const key = comment.file ? commentKey(comment) : `${comment.file}\0${comment.text}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function countsFromBaseline(items) {
  const counts = new Map();
  for (const item of items) {
    const key = `${item.file}\0${item.text}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

const actual = countsOf(current);
const expected = countsFromBaseline(baseline.comments);
const problems = [];

if (baseline.comments.length !== baseline.ceiling) {
  problems.push(`baseline ceiling is ${baseline.ceiling}, but the allowlist has ${baseline.comments.length} comments`);
}
if (current.length !== baseline.ceiling) {
  problems.push(`found ${current.length} comments; the ceiling is ${baseline.ceiling}`);
}

for (const [key, count] of actual) {
  const allowed = expected.get(key) || 0;
  if (count > allowed) {
    const [file, text] = key.split("\0");
    problems.push(`new comment in ${file}: ${text}`);
  }
}
for (const [key, count] of expected) {
  const found = actual.get(key) || 0;
  if (count > found) {
    const [file, text] = key.split("\0");
    problems.push(`baseline entry no longer exists in ${file}: ${text}`);
  }
}

let baseCeiling = null;
try {
  const previous = execFileSync("git", ["show", "origin/main:config/comment-baseline.json"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  baseCeiling = JSON.parse(previous).ceiling;
} catch {
  baseCeiling = null;
}
if (typeof baseCeiling === "number" && baseline.ceiling > baseCeiling) {
  problems.push(`comment ceiling grew from ${baseCeiling} to ${baseline.ceiling}`);
}

if (problems.length) {
  console.error("Comment baseline check failed:");
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log(`Comment baseline holds ${baseline.ceiling} comments.`);
