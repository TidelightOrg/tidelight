import { getSystemStatus } from "@/lib/tic/system-status";

export const dynamic = "force-dynamic";

/** Public, read-only service snapshot for the landing page status card. */
export async function GET() {
  try {
    const status = await getSystemStatus();
    return Response.json(status, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ error: "Status snapshot unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
