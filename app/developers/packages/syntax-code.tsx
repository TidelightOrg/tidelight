const keywords = new Set([
  "async", "await", "const", "let", "var", "function", "return", "if", "else", "throw", "new", "import", "from", "export", "default", "class", "extends", "for", "of", "in", "while", "try", "catch", "true", "false", "null", "undefined", "None", "True", "False", "def", "print", "with", "as", "pass", "raise",
]);

export function SyntaxCode({ code, language = "typescript" }: { code: string; language?: string }) {
  const shell = /shell|bash|sh|cli|command/i.test(language);
  const python = /python/i.test(language);
  const json = /json/i.test(language);
  const tokens = code.split(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\n]*|#[^\n]*|\b[A-Za-z_$][\w$]*\b|\b\d+(?:\.\d+)?\b)/g);
  return <>{tokens.map((token, index) => {
    if (!token) return null;
    let kind = "";
    if (/^(?:"|'|`)/.test(token)) kind = "string";
    else if ((shell || python || json) && token.startsWith("#") || !shell && !python && !json && token.startsWith("//")) kind = "comment";
    else if (/^\d/.test(token)) kind = "number";
    else if (keywords.has(token)) kind = "keyword";
    else if (/^[A-Z_][A-Z0-9_]+$/.test(token)) kind = "constant";
    else if (json) kind = "property";
    else if (/^[A-Za-z_$][\w$]*$/.test(token)) kind = "identifier";
    return kind ? <span className={`tic-syntax-${kind}`} key={index}>{token}</span> : token;
  })}</>;
}
