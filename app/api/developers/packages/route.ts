import { NextResponse } from "next/server";

export const revalidate = 300;

const packages = {
  sdk: { registry: "npm", name: "@tidelight/sdk", url: "https://www.npmjs.com/package/@tidelight/sdk", install: "npm install @tidelight/sdk" },
  mcp: { registry: "npm", name: "@tidelight/mcp", url: "https://www.npmjs.com/package/@tidelight/mcp", install: "npm install @tidelight/mcp" },
  react: { registry: "npm", name: "@tidelight/react", url: "https://www.npmjs.com/package/@tidelight/react", install: "npm install @tidelight/react" },
  cli: { registry: "npm", name: "@tidelight/cli", url: "https://www.npmjs.com/package/@tidelight/cli", install: "npm install @tidelight/cli" },
  python: { registry: "pypi", name: "tidelight", url: "https://pypi.org/project/tidelight/", install: "python -m pip install tidelight" },
} as const;

type PackageId = keyof typeof packages;

async function readVersion(id: PackageId) {
  const item = packages[id];
  const registryUrl = item.registry === "npm"
    ? `https://registry.npmjs.org/${encodeURIComponent(item.name).replaceAll("%2F", "%2f")}/latest`
    : `https://pypi.org/pypi/${item.name}/json`;
  const response = await fetch(registryUrl, { next: { revalidate: 300 }, headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${item.registry} returned ${response.status}`);
  const data = await response.json() as { version?: string; description?: string; info?: { version?: string; summary?: string }; dist?: { integrity?: string; tarball?: string }; urls?: Array<{ filename?: string; digests?: { sha256?: string }; size?: number }> };
  return {
    id,
    ...item,
    version: item.registry === "npm" ? data.version ?? null : data.info?.version ?? null,
    summary: data.description ?? data.info?.summary ?? null,
    integrity: data.dist?.integrity ?? null,
    tarball: data.dist?.tarball ?? null,
    files: data.urls?.map(file => ({ filename: file.filename, sha256: file.digests?.sha256, size: file.size })) ?? [],
    status: "published" as const,
    checkedAt: new Date().toISOString(),
  };
}

export async function GET() {
  const results = await Promise.all(Object.keys(packages).map(async id => {
    try { return await readVersion(id as PackageId); }
    catch { return { id, ...packages[id as PackageId], version: null, summary: null, integrity: null, tarball: null, files: [], status: "unavailable" as const, checkedAt: new Date().toISOString() }; }
  }));
  return NextResponse.json({ packages: Object.fromEntries(results.map(item => [item.id, item])), checkedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900" } });
}
