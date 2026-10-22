"use client";

import { useState } from "react";
import { SyntaxCode } from "./syntax-code";

export function CopyableCode({ code, language }: { code: string; language: string }) {
  const [status, setStatus] = useState<"copied" | "failed" | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setStatus("copied");
      window.setTimeout(() => setStatus(null), 1800);
    } catch {
      setStatus("failed");
      window.setTimeout(() => setStatus(null), 2600);
    }
  }

  return <section className="tic-code-card" aria-label={`${language} code sample`}>
    <div className="tic-code-toolbar">
      <span className="tic-code-language">{language}</span>
      <button type="button" className="tic-code-copy" onClick={copy} aria-live="polite" aria-label={status === "copied" ? "Code copied" : "Copy code"}>
        {status === "copied" ? "Copied" : status === "failed" ? "Copy unavailable" : "Copy code"}
      </button>
    </div>
    <pre tabIndex={0}><code><SyntaxCode code={code} language={language} /></code></pre>
  </section>;
}
