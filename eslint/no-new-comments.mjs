import path from "node:path";
import { fileURLToPath } from "node:url";
import baseline from "../config/comment-baseline.json" with { type: "json" };
import { normalizeComment } from "../scripts/comment-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowed = new Map();
for (const item of baseline.comments) {
  const key = `${item.file}\0${item.text}`;
  allowed.set(key, (allowed.get(key) || 0) + 1);
}

function relativeFile(filename) {
  if (!filename || filename === "<text>" || filename === "<input>") return null;
  const relative = path.relative(root, path.resolve(filename));
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return relative;
}

const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "Allow only comments already recorded in the shrinking baseline.",
    },
    schema: [],
    messages: {
      banned: "New comments are not allowed. Record a non-obvious decision in docs/adr/ instead.",
    },
  },
  create(context) {
    const file = relativeFile(context.filename);
    const remaining = new Map();
    if (file) {
      const prefix = `${file}\0`;
      for (const [key, count] of allowed) {
        if (key.startsWith(prefix)) remaining.set(key, count);
      }
    }
    return {
      Program() {
        if (!file) return;
        const source = context.sourceCode;
        for (const comment of source.getAllComments()) {
          const raw = source.text.slice(comment.range[0], comment.range[1]);
          if (raw.startsWith("#!")) continue;
          const key = `${file}\0${normalizeComment(raw)}`;
          const left = remaining.get(key) || 0;
          if (left <= 0) context.report({ loc: comment.loc, messageId: "banned" });
          else remaining.set(key, left - 1);
        }
      },
    };
  },
};

export default rule;
