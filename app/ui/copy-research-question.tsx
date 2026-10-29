"use client";

import { useState } from "react";

export default function CopyResearchQuestion({ question }: { question: string }) {
  const [copied, setCopied] = useState(false);

  async function copyQuestion() {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyQuestion()}
      aria-label={copied ? "Research question copied" : "Copy research question"}
      title={copied ? "Copied" : "Copy question"}
      style={{ border: "1px solid var(--line)", borderRadius: 7, padding: "5px 8px", background: "transparent", color: "var(--muted)", cursor: "pointer", font: "600 9px/1 var(--mono)", whiteSpace: "nowrap" }}
    >
      {copied ? "Copied" : "Copy question"}
    </button>
  );
}
