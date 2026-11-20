import ts from "typescript";
import fs from "fs";
import path from "path";

const skipDirs = new Set([
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".git",
  "build",
  "out",
  ".vercel",
  "__pycache__",
]);

const jsExts = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const hashExts = new Set([".py", ".sh", ".toml", ".env"]);

export function normalizeComment(raw) {
  let text = String(raw).replace(/\r\n/g, "\n").trim();
  if (text.startsWith("<!--")) {
    text = text.slice(4).trimEnd();
    if (text.endsWith("--!>")) text = text.slice(0, -4);
    else if (text.endsWith("-->")) text = text.slice(0, -3);
  }
  else if (text.startsWith("/*")) text = text.slice(2).replace(/\*\/\s*$/, "");
  else if (text.startsWith("//")) text = text.slice(2);
  else if (text.startsWith("--")) text = text.slice(2);
  else if (text.startsWith("#")) text = text.slice(1);
  return text.replace(/\s+/g, " ").trim();
}

function lineCol(text, pos) {
  let line = 1;
  let col = 1;
  for (let i = 0; i < pos && i < text.length; i++) {
    if (text[i] === "\n") {
      line++;
      col = 1;
    } else col++;
  }
  return { line, col };
}

function extractJs(file, text) {
  const ext = path.extname(file);
  const scriptKind =
    ext === ".tsx" ? ts.ScriptKind.TSX : ext === ".jsx" ? ts.ScriptKind.JSX : ext === ".ts" ? ts.ScriptKind.TS : ts.ScriptKind.JS;
  const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
  const seen = new Set();
  const comments = [];

  function add(range) {
    if (range.pos < 0 || range.end > text.length || range.end <= range.pos) return;
    const key = `${range.pos}:${range.end}`;
    if (seen.has(key)) return;
    const raw = text.slice(range.pos, range.end);
    if (!raw.startsWith("//") && !raw.startsWith("/*")) return;
    seen.add(key);
    const start = lineCol(text, range.pos);
    const end = lineCol(text, range.end - 1);
    comments.push({
      line: start.line,
      col: start.col,
      endLine: end.line,
      pos: range.pos,
      end: range.end,
      raw,
      kind: raw.startsWith("//") ? "line" : "block",
    });
  }

  function visit(node) {
    if (node.kind === ts.SyntaxKind.JsxText) return;
    for (const range of ts.getLeadingCommentRanges(text, node.pos) || []) add(range);
    const children = node.getChildren(sourceFile);
    if (children.length === 0) {
      for (const range of ts.getTrailingCommentRanges(text, node.end) || []) add(range);
    } else {
      for (const child of children) visit(child);
    }
  }

  visit(sourceFile);
  comments.sort((a, b) => a.pos - b.pos);
  return comments;
}

function extractHash(text) {
  const comments = [];
  let i = 0;
  const n = text.length;
  let state = "code";
  while (i < n) {
    const c = text[i];
    if (state === "code") {
      if (c === "#") {
        const start = i;
        while (i < n && text[i] !== "\n") i++;
        const startPos = lineCol(text, start);
        comments.push({
          line: startPos.line,
          col: startPos.col,
          endLine: startPos.line,
          pos: start,
          end: i,
          raw: text.slice(start, i),
          kind: "line",
        });
        continue;
      }
      const prev = i > 0 ? text[i - 1] : "";
      if (!/[A-Za-z0-9_]/.test(prev)) {
        let j = i;
        while (j < n && /[rRuUbBfF]/.test(text[j]) && j - i < 3) j++;
        if (j < n && (text[j] === "'" || text[j] === '"')) {
          const quote = text[j];
          const triple = text.slice(j, j + 3) === quote.repeat(3);
          i = j + (triple ? 3 : 1);
          state = (triple ? "t" : "") + quote;
          continue;
        }
      }
      i++;
      continue;
    }
    const triple = state.startsWith("t");
    const quote = triple ? state[1] : state;
    if (triple) {
      if (text.slice(i, i + 3) === quote.repeat(3)) {
        i += 3;
        state = "code";
        continue;
      }
      i++;
      continue;
    }
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === quote || c === "\n") state = "code";
    i++;
  }
  return comments;
}

function extractSql(text) {
  const comments = [];
  let i = 0;
  const n = text.length;
  let state = "code";
  while (i < n) {
    const c = text[i];
    if (state === "code") {
      if (c === "-" && text[i + 1] === "-") {
        const start = i;
        while (i < n && text[i] !== "\n") i++;
        const startPos = lineCol(text, start);
        comments.push({
          line: startPos.line,
          col: startPos.col,
          endLine: startPos.line,
          pos: start,
          end: i,
          raw: text.slice(start, i),
          kind: "line",
        });
        continue;
      }
      if (c === "/" && text[i + 1] === "*") {
        const start = i;
        i += 2;
        while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
        const end = Math.min(n, i + 2);
        const startPos = lineCol(text, start);
        comments.push({
          line: startPos.line,
          col: startPos.col,
          endLine: lineCol(text, end - 1).line,
          pos: start,
          end,
          raw: text.slice(start, end),
          kind: "block",
        });
        i = end;
        continue;
      }
      if (c === "'") {
        state = "sq";
        i++;
        continue;
      }
      if (c === '"') {
        state = "dq";
        i++;
        continue;
      }
      if (c === "$") {
        const match = text.slice(i).match(/^\$[A-Za-z0-9_]*\$/);
        if (match) {
          state = `d:${match[0]}`;
          i += match[0].length;
          continue;
        }
      }
      i++;
      continue;
    }
    if (state === "sq") {
      if (c === "'" && text[i + 1] === "'") {
        i += 2;
        continue;
      }
      if (c === "'") state = "code";
      i++;
      continue;
    }
    if (state === "dq") {
      if (c === '"') state = "code";
      i++;
      continue;
    }
    if (state.startsWith("d:")) {
      const tag = state.slice(2);
      if (text.startsWith(tag, i)) {
        i += tag.length;
        state = "code";
        continue;
      }
      i++;
    }
  }
  return comments;
}

function extractCss(text) {
  const comments = [];
  let i = 0;
  const n = text.length;
  let quote = null;
  while (i < n) {
    const c = text[i];
    if (quote) {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const start = i;
      i += 2;
      while (i < n && !(text[i] === "*" && text[i + 1] === "/")) i++;
      const end = Math.min(n, i + 2);
      const startPos = lineCol(text, start);
      comments.push({
        line: startPos.line,
        col: startPos.col,
        endLine: lineCol(text, end - 1).line,
        pos: start,
        end,
        raw: text.slice(start, end),
        kind: "block",
      });
      i = end;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      i++;
      continue;
    }
    i++;
  }
  return comments;
}

function extractHtml(text) {
  const comments = [];
  let searchFrom = 0;
  while (searchFrom < text.length) {
    const start = text.indexOf("<!--", searchFrom);
    if (start < 0) break;
    let end = start + 4;
    let closed = false;
    while (end < text.length) {
      if (text.startsWith("-->", end)) {
        end += 3;
        closed = true;
        break;
      }
      if (text.startsWith("--!>", end)) {
        end += 4;
        closed = true;
        break;
      }
      end++;
    }
    if (!closed) break;
    const startPos = lineCol(text, start);
    comments.push({
      line: startPos.line,
      col: startPos.col,
      endLine: lineCol(text, end - 1).line,
      pos: start,
      end,
      raw: text.slice(start, end),
      kind: "html",
    });
    searchFrom = end;
  }
  return comments;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isSource(file) {
  const base = path.basename(file);
  if (base === "next-env.d.ts") return false;
  if (base === "Dockerfile" || base === ".env.example") return true;
  const ext = path.extname(file);
  return (
    jsExts.has(ext) ||
    hashExts.has(ext) ||
    ext === ".css" ||
    ext === ".sql" ||
    ext === ".html" ||
    ext === ".svg" ||
    ext === ".yml" ||
    ext === ".yaml"
  );
}

export function extractFileComments(file, text) {
  const base = path.basename(file);
  const ext = path.extname(file);
  if (jsExts.has(ext)) return extractJs(file, text);
  if (base === ".env.example" || hashExts.has(ext) || base === "Dockerfile") return extractHash(text);
  if (ext === ".sql") return extractSql(text);
  if (ext === ".css") return extractCss(text);
  if (ext === ".yml" || ext === ".yaml") return extractHash(text);
  if (ext === ".html" || ext === ".svg") return extractHtml(text);
  return [];
}

export function inventoryComments(root) {
  const comments = [];
  for (const file of walk(root)) {
    if (!isSource(file)) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(root, file);
    for (const comment of extractFileComments(file, text)) comments.push({ file: rel, ...comment });
  }
  return comments;
}

export function commentKey(comment) {
  return `${comment.file}\0${normalizeComment(comment.raw)}`;
}

export function countKeys(comments) {
  const counts = new Map();
  for (const comment of comments) {
    const key = commentKey(comment);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}
