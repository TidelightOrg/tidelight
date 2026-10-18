"use client";

import Link from "next/link";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);
  const current = previews[selected];

  async function copySource() {
    try {
      await navigator.clipboard.writeText(current.source);
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
          <p>Preview package interfaces and run the source checks in the mother repository. Registry installs stay unavailable until the first approved release.</p>
        </div>
        <span className="tic-package-workbench-status"><i aria-hidden="true"/>Source packages · unpublished</span>
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
                onClick={() => { setSelected(id); setCopied(false); }}
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
            <div className="tic-package-workbench-state"><span>Source available</span><span>Not published to registry</span></div>

            <div className="tic-package-local-check">
              <span>LOCAL SOURCE CHECK</span>
              <code>{current.command}</code>
            </div>

            <div className="tic-package-workbench-actions">
              <Link href={current.href}>View package details <span aria-hidden="true">→</span></Link>
              <button type="button" onClick={copySource}>{copied ? "Copied" : "Copy example"}</button>
            </div>
            <p className="tic-package-workbench-note" role="status" aria-live="polite">
              {copied ? "Example copied." : "Examples show the source interface; they do not include sample market results."}
            </p>
          </div>

          <div className="tic-package-workbench-preview" aria-label={`${current.name} example`} key={selected}>
            <div className="tic-package-preview-topline"><span>EXAMPLE / SOURCE INTERFACE</span><span aria-hidden="true">•••</span></div>
            <pre tabIndex={0}><code>{current.source}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}
