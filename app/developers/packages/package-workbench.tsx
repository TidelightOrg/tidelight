"use client";

import Link from "next/link";
import { useState } from "react";
import { RegistryFacts, useRegistryPackage } from "./registry-facts";

type PackageId = "sdk" | "mcp" | "python" | "react" | "cli";

const previews: Record<PackageId, {
  name: string;
  type: string;
  glyph: string;
  description: string;
  command: string;
  source: string;
  href: string;
}> = {
  sdk: {
    name: "@tidelight/sdk",
    type: "TypeScript · JavaScript",
    glyph: "TS",
    description: "Use one typed client for supported market, research-job, and webhook operations.",
    command: "cd sdk/typescript && npm ci && npm test",
    source: `import { TidelightClient } from "@tidelight/sdk";

const client = new TidelightClient({
  apiKey: process.env.TIDELIGHT_API_KEY!,
});

const accepted = await client.startCompanyResearch(
  "NVDA",
  crypto.randomUUID(),
);

const result = await client.waitForResearchJob(
  accepted.job_id,
  { intervalMs: 2000, timeoutMs: 120000 },
);`,
    href: "/developers/packages/sdk",
  },
  mcp: {
    name: "@tidelight/mcp",
    type: "Node.js · MCP stdio",
    glyph: "M",
    description: "Bridge stdio-only MCP clients to the hosted, scope-filtered Tidelight service.",
    command: "cd public/components/mcp/server && npm ci && npm test",
    source: `{
  "mcpServers": {
    "tidelight": {
      "command": "node",
      "args": ["/absolute/path/to/tidelight/public/components/mcp/server/dist/cli.js"],
      "env": {
        "TIDELIGHT_API_KEY": "YOUR_PROJECT_KEY"
      }
    }
  }
}`,
    href: "/developers/packages/mcp",
  },
  python: {
    name: "tidelight",
    type: "Python SDK",
    glyph: "Py",
    description: "Call supported Tidelight endpoints from Python with typed response models and bounded retries.",
    command: "PYTHONPATH=sdk/python/src python -m unittest discover -s sdk/python/tests -v",
    source: `import os
from tidelight import Client

client = Client(os.environ["TIDELIGHT_API_KEY"])
page = client.list_tokenized_equities(
    limit=20,
    underlying_ticker="AAPL",
)

for instrument in page.data:
    print(instrument.symbol, instrument.underlying_ticker)`,
    href: "/developers/packages/python",
  },
  react: {
    name: "@tidelight/react",
    type: "React · hooks & UI",
    glyph: "R",
    description: "Compose accessible research and market interfaces with hooks backed by the SDK contract.",
    command: "cd sdk/typescript && npm ci && npm test && cd ../../packages/react && npm ci && npm test",
    source: `import {
  TidelightProvider,
  TokenizedEquityGrid,
  useTokenizedEquities,
} from "@tidelight/react";

function MarketPanel() {
  const result = useTokenizedEquities({
    underlyingTicker: "NVDA",
    limit: 20,
  });

  return (
    <TokenizedEquityGrid
      instruments={result.data?.data ?? []}
      isLoading={result.isLoading}
      error={result.error?.message}
      onRetry={result.refresh}
    />
  );
}`,
    href: "/developers/packages/react",
  },
  cli: {
    name: "@tidelight/cli",
    type: "Node.js · command line",
    glyph: "$",
    description: "Manage authorized research and market workflows from a terminal or CI job.",
    command: "cd sdk/typescript && npm ci && npm test && cd ../../packages/cli && npm ci && npm test",
    source: `# Build and run from the mother repository
cd sdk/typescript && npm ci && npm test
cd ../../packages/cli
npm ci && npm test
node dist/bin.js --help`,
    href: "/developers/packages/cli",
  },
};

const order: PackageId[] = ["sdk", "mcp", "python", "react", "cli"];

export function PackageWorkbench() {
  const [selected, setSelected] = useState<PackageId>("sdk");
  const [surface, setSurface] = useState<"install" | "example" | "verify">("install");
  const [copied, setCopied] = useState(false);
  const current = previews[selected];
  const registry = useRegistryPackage(selected);
  const exactInstall = registry.version
    ? registry.registry === "npm"
      ? `npm install ${registry.name}@${registry.version}`
      : `python -m pip install ${registry.name}==${registry.version}`
    : registry.install;
  const compatibility: Record<PackageId, string[]> = {
    sdk: ["Tested on Node 22.x", "ES modules", "TypeScript declarations"],
    mcp: ["Node.js 22+", "Tested on Node 22.x", "Hosted API key required"],
    python: ["Python 3.10+", "Tested on 3.10 & 3.12", "pip / virtualenv"],
    react: ["React 18 or 19", "Tested on React 19.2.8", "SDK ^0.1.1 peer"],
    cli: ["Node.js 22+", "Tested on Node 22", "OS keychain integration"],
  };
  const preview = surface === "install" ? exactInstall : surface === "verify" ? current.command : current.source;

  async function copySource() {
    try {
      await navigator.clipboard.writeText(preview);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="tic-package-workbench" aria-labelledby="package-workbench-title">
      <div className="tic-package-workbench-heading">
        <div>
          <p className="tic-eyebrow">BUILT AROUND YOUR WORKFLOW</p>
          <h2 id="package-workbench-title">One platform. Five ways in.</h2>
          <p>Preview package interfaces, install the published release, or run source checks in the mother repository.</p>
        </div>
          <span className={`tic-package-workbench-status ${registry.status === "published" && registry.version ? "is-verified" : "is-pending"}`}><i aria-hidden="true"/>{registry.status === "published" && registry.version ? "Registry release verified" : registry.version ? "Using last verified release" : "Checking public registry"}</span>
      </div>

      <div className="tic-package-workbench-shell">
        <div className="tic-package-workbench-tabs" aria-label="Choose a package preview">
          {order.map((id) => {
            const item = previews[id];
            return (
              <button
                key={id}
                type="button"
                aria-pressed={selected === id}
                onClick={() => { setSelected(id); setCopied(false); setSurface("install"); }}
              >
                <span aria-hidden="true">{item.glyph}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </div>

        <div className="tic-package-workbench-content">
          <div className="tic-package-workbench-copy">
            <p className="tic-package-workbench-type">{current.type}</p>
            <h3>{current.name}</h3>
            <p>{current.description}</p>
            <div className="tic-package-workbench-state"><span>{registry.status === "published" && registry.version ? `Published · v${registry.version}` : "Registry status unavailable"}</span><span>{registry.registry === "npm" ? "npm registry" : "PyPI registry"}</span></div>
            <RegistryFacts packageId={selected} compact />

            <div className="tic-package-compatibility" aria-label={`${current.name} compatibility`}>
              <span>COMPATIBILITY</span>
              <div>{compatibility[selected].map(item => <span key={item}>{item}</span>)}</div>
            </div>

            <div className="tic-package-workbench-actions">
              <Link href={current.href}>View package details <span aria-hidden="true">→</span></Link>
              <a href={registry.url} target="_blank" rel="noreferrer">Open registry <span aria-hidden="true">↗</span></a>
            </div>
            <p className="tic-package-workbench-note" role="status" aria-live="polite">{copied ? `${surface === "install" ? "Install command" : surface === "verify" ? "Source check" : "Example"} copied.` : registry.status !== "published" ? `Live registry check unavailable. Install is pinned to the last verified version ${registry.version ?? "not yet verified"}.` : registry.integrity ? "Archive integrity is published by the registry and linked in package details." : "Examples show the source interface; they do not include sample market results."}</p>
          </div>

          <div className="tic-package-workbench-preview" aria-label={`${current.name} package workbench`} key={`${selected}-${surface}`}>
            <div className="tic-package-preview-topline"><div role="group" aria-label={`${current.name} workbench view`}>
              {(["install", "example", "verify"] as const).map(view => <button key={view} type="button" aria-pressed={surface === view} onClick={() => { setSurface(view); setCopied(false); }}>{view === "install" ? "Install" : view === "example" ? "Example" : "Test source"}</button>)}
            </div><button className="tic-package-copy" type="button" onClick={copySource}>{copied ? "Copied" : "Copy"}</button></div>
            <pre tabIndex={0} aria-label={surface === "install" ? "Version-pinned install command" : surface === "verify" ? "Mother repository package test command" : "Package example source"}><code>{preview}</code></pre>
            <div className="tic-package-preview-footer"><span>{surface === "install" ? (registry.version ? `PINNED TO ${registry.version}` : "REGISTRY VERSION PENDING") : surface === "verify" ? "MOTHER REPOSITORY · LOCAL TESTS" : "QUICKSTART SNIPPET · NO LIVE DATA"}</span>{surface === "verify" && <Link href="https://github.com/TidelightOrg/tidelight">Browse source ↗</Link>}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
