import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthState } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const probe = new URL(request.url).searchParams.get("probe");
    const cookieStore = probe ? await cookies() : null;
    const parsedCookies = cookieStore?.getAll() ?? [];
    const parsedAuthCookieCount = parsedCookies
      .filter(({ name }) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)).length;
    const authCookieShape = parsedCookies
      .filter(({ name }) => /^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name))
      .map(({ name, value }) => name + ":" + (typeof value === "string" ? value.length : "missing"))
      .sort()
      .join(",");
    const rawAuthCookieShape = (request.headers.get("cookie") ?? "").split(/;\s*/).flatMap((pair) => {
      const separator = pair.indexOf("=");
      if (separator < 1) return [];
      const name = pair.slice(0, separator).trim();
      if (!/^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)) return [];
      return [name + ":" + pair.slice(separator + 1).length];
    }).sort().join(",");

    if (probe === "shared") {
      const authState = await getServerAuthState();
      return NextResponse.json({
        authenticated: Boolean(authState.user),
        diagnostics: {
          authPath: "shared-helper",
          errorCode: authState.errorCode,
          errorName: authState.errorName,
          parsedAuthCookieCount,
          authCookieShape,
          rawAuthCookieShape,
        },
      }, { headers: { "Cache-Control": "no-store, max-age=0" } });
    }

    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    const response: Record<string, unknown> = { authenticated: Boolean(user && !error) };
    if (probe) {
      const rawCounts = new Map<string, number>();
      for (const pair of (request.headers.get("cookie") ?? "").split(/;\s*/)) {
        const name = pair.slice(0, pair.indexOf("=")).trim();
        if (/^sb-[a-z0-9-]+-auth-token(?:\.\d+)?$/i.test(name)) rawCounts.set(name, (rawCounts.get(name) ?? 0) + 1);
      }
      response.diagnostics = {
        authPath: "route-handler",
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
