import type { PackageId } from "./catalog.generated";

const labels: Record<PackageId, string> = {
  sdk: "TypeScript and JavaScript",
  python: "Python",
  react: "React",
  cli: "Command line",
  mcp: "Model Context Protocol",
};

function ReactLogo() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="2.3" fill="currentColor"/><g fill="none" stroke="currentColor" strokeWidth="1.35"><ellipse cx="16" cy="16" rx="13" ry="5"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="13" ry="5" transform="rotate(120 16 16)"/></g></svg>;
}

function PythonLogo() {
  return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#3776ab" d="M15.7 3.2c-6.2 0-5.8 2.7-5.8 2.7v3.2h5.9v1H7.6S3 9.6 3 16.1s4 6.2 4 6.2h2.4v-3.4s-.1-4 4-4h6.2s3.5.1 3.5-3.4V6.5s.5-3.3-7.4-3.3Zm-3.2 2.2a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Z"/><path fill="#ffd343" d="M16.3 28.8c6.2 0 5.8-2.7 5.8-2.7v-3.2h-5.9v-1h8.2s4.6.5 4.6-6-4-6.2-4-6.2h-2.4v3.4s.1 4-4 4h-6.2s-3.5-.1-3.5 3.4v5s-.5 3.3 7.4 3.3Zm3.2-2.2a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"/></svg>;
}

function TerminalLogo() {
  return <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="5.5" width="25" height="21" rx="4"/><path d="m9 12 4 3.5L9 19m8 0h6"/></svg>;
}

export function PackageLanguageMark({ packageId }: { packageId: PackageId }) {
  const icon = packageId === "react" ? <ReactLogo/> : packageId === "python" ? <PythonLogo/> : packageId === "cli" ? <TerminalLogo/> : packageId === "sdk" ? <span className="tic-language-pair" aria-hidden="true"><svg className="tic-language-ts" viewBox="0 0 32 32"><rect width="32" height="32" rx="5"/><path d="M6 11h12M12 11v12m7-8c.8-1.2 2-1.7 3.6-1.7 2.3 0 3.6 1.1 3.6 2.5 0 3.8-7.1 1.5-7.1 5 0 1.5 1.4 2.5 3.7 2.5 1.5 0 2.8-.5 3.7-1.6" /></svg><svg className="tic-language-js" viewBox="0 0 32 32"><rect width="32" height="32" rx="5"/><path d="M15 8v13c0 3-3.7 3.1-5.2 1.1M20 20.7c.8 1 2 1.5 3.7 1.5 2 0 3.3-.9 3.3-2.4 0-3.6-7-1.4-7-5 0-1.5 1.4-2.5 3.7-2.5 1.3 0 2.5.4 3.3 1.2"/></svg></span> : <span className="tic-language-mcp" aria-hidden="true">MCP</span>;
  return <span className={`tic-package-glyph tic-language-mark tic-language-${packageId}`} role="img" aria-label={labels[packageId]}>{icon}</span>;
}
