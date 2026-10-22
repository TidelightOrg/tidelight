"use client";

import { useEffect, useState } from "react";

import { PackageLanguageMark } from "./package-language-mark";

type PackageId = "sdk" | "mcp" | "react" | "cli" | "python";
export type RegistryPackage = {
  id: PackageId;
  registry: "npm" | "pypi";
  name: string;
  url: string;
  install: string;
  version: string | null;
  summary: string | null;
  integrity: string | null;
  tarball: string | null;
  files: Array<{ filename?: string; sha256?: string; size?: number }>;
  status: "published" | "unavailable";
};

let registryRequest: Promise<Record<PackageId, RegistryPackage>> | undefined;
const fallback: Record<PackageId, RegistryPackage> = {
  sdk: { id: "sdk", registry: "npm", name: "@tidelight/sdk", url: "https://www.npmjs.com/package/@tidelight/sdk", install: "npm install @tidelight/sdk@0.1.1", version: "0.1.1", summary: "Official Tidelight TypeScript SDK", integrity: null, tarball: null, files: [], status: "unavailable" },
  mcp: { id: "mcp", registry: "npm", name: "@tidelight/mcp", url: "https://www.npmjs.com/package/@tidelight/mcp", install: "npm install @tidelight/mcp@0.1.1", version: "0.1.1", summary: "Official Tidelight MCP stdio bridge", integrity: null, tarball: null, files: [], status: "unavailable" },
  react: { id: "react", registry: "npm", name: "@tidelight/react", url: "https://www.npmjs.com/package/@tidelight/react", install: "npm install @tidelight/react@0.1.1", version: "0.1.1", summary: "Official Tidelight React package", integrity: null, tarball: null, files: [], status: "unavailable" },
  cli: { id: "cli", registry: "npm", name: "@tidelight/cli", url: "https://www.npmjs.com/package/@tidelight/cli", install: "npm install @tidelight/cli@0.1.1", version: "0.1.1", summary: "Official Tidelight command line interface", integrity: null, tarball: null, files: [], status: "unavailable" },
  python: { id: "python", registry: "pypi", name: "tidelight", url: "https://pypi.org/project/tidelight/", install: "python -m pip install tidelight==0.1.1", version: "0.1.1", summary: "Official Tidelight Intelligence Cloud Python client", integrity: null, tarball: null, files: [], status: "unavailable" },
};

export function useRegistryPackage(packageId: PackageId) {
  const [entry, setEntry] = useState(fallback[packageId]);
  const [settledPackage, setSettledPackage] = useState<PackageId | null>(null);
  const checking = settledPackage !== packageId;
  const visibleEntry = entry.id === packageId ? entry : fallback[packageId];
  useEffect(() => {
    let active = true;
    if (!registryRequest) {
      registryRequest = fetch("/api/developers/packages", { headers: { accept: "application/json" } })
        .then(response => { if (!response.ok) throw new Error("Registry check failed"); return response.json(); })
        .then(payload => payload.packages as Record<PackageId, RegistryPackage>)
        .catch(error => { registryRequest = undefined; throw error; });
    }
    registryRequest.then(packages => { if (active && packages[packageId]) setEntry(packages[packageId]); }).catch(() => undefined).finally(() => { if (active) setSettledPackage(packageId); });
    return () => { active = false; };
  }, [packageId]);
  return { entry: visibleEntry, checking };
}

export function RegistryFacts({ packageId, compact = false }: { packageId: PackageId; compact?: boolean }) {
  const { entry, checking } = useRegistryPackage(packageId);
  return <section className={`tic-registry-facts${compact ? " is-compact" : ""}`} aria-label={`${entry.name} registry release details`}>
    <div className="tic-registry-facts-head"><span className="tic-registry-live-dot" aria-hidden="true"/><strong>{entry.status === "published" ? `Published on ${entry.registry === "npm" ? "npm" : "PyPI"}` : checking ? `Checking ${entry.registry === "npm" ? "npm" : "PyPI"} registry…` : entry.version ? `Last verified release · ${entry.registry === "npm" ? "npm" : "PyPI"}` : "Registry check unavailable"}</strong><span className="tic-registry-version">{entry.version ? `v${entry.version}` : checking ? "Checking…" : "Version unavailable"}</span></div>
    {!compact && <p>{entry.summary ?? `Official ${entry.name} distribution.`}</p>}
    <code className="tic-registry-install">{entry.install}</code>
    <div className="tic-registry-actions"><a href={entry.url} target="_blank" rel="noreferrer">Open registry page <span aria-hidden="true">↗</span></a>{entry.tarball && <a href={entry.tarball}>Download archive <span aria-hidden="true">↓</span></a>}{entry.integrity && <span title={entry.integrity}>npm SHA-512 integrity verified by registry</span>}{entry.files.find(file => file.sha256) && <span title={entry.files.find(file => file.sha256)?.sha256}>PyPI SHA-256 published</span>}</div>
  </section>;
}

export function PackageRegistryCard({ packageId, name, summary, href, glyph, ecosystem, index }: {
  packageId: PackageId; name: string; summary: string; href: string; glyph?: string; ecosystem: string; index: number;
}) {
  const { entry, checking } = useRegistryPackage(packageId);
  return <article className={`tic-package-card ${entry.status === "published" && entry.version ? "is-published" : "is-unavailable"}`}>
    <div className="tic-package-card-top"><PackageLanguageMark packageId={packageId} /><span className="tic-package-number">0{index + 1} / {ecosystem}</span></div>
    <h3>{name}</h3><p>{summary}</p>
    <div className="tic-package-card-status"><span className="tic-package-status-mark" aria-hidden="true">{entry.status === "published" && entry.version ? "✓" : "·"}</span><span className="tic-package-source-label">{entry.status === "published" && entry.version ? `Published · ${entry.registry}` : checking ? `Checking ${entry.registry}…` : entry.version ? `Last verified · ${entry.registry}` : "Registry unavailable"}</span><code>{entry.version ? `v${entry.version}` : checking ? "Checking…" : "Version unavailable"}</code></div>
    <code className="tic-package-card-install">{entry.install}</code>
    {packageId === "mcp" && <a className="tic-package-ghcr-link" href="https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp">Container · ghcr.io/tidelightorg/tidelight-mcp:0.1.1 ↗</a>}
    <a className="tic-package-card-link" href={href.startsWith("http") ? href : `https://package.tidelight.app${href}`}>Package details <span aria-hidden="true">→</span></a>
  </article>;
}
