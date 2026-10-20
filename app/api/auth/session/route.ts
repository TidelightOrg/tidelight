import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const response: Record<string, unknown> = { authenticated: Boolean(user && !error) };
    if (new URL(request.url).searchParams.has("probe")) {
      const cookieStore = await cookies();
      const rawCounts = new Map<string, number>();
      for (const pair of (request.headers.get("cookie") ?? "").split(/;\s*/)) {
        const name = pair.slice(0, pair.indexOf("=")).trim();
        if (/^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)) rawCounts.set(name, (rawCounts.get(name) ?? 0) + 1);
      }
      const parsedAuthCookieCount = cookieStore.getAll().filter(({ name }) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)).length;
      response.diagnostics = {
        errorCode: error?.code ?? null,
        rawAuthCookieCount: [...rawCounts.values()].reduce((count, value) => count + value, 0),
        rawDuplicateAuthCookieCount: [...rawCounts.values()].filter((count) => count > 1).length,
        parsedAuthCookieCount,
      };
    }
    return NextResponse.json(response, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, {
      status: 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
}
