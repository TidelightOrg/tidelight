import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { readSupabaseAuthCookieHeader } from "@/lib/supabase/legacy-cookie-migration";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestHeaders = await headers();
  const cookieInfo = readSupabaseAuthCookieHeader(requestHeaders.get("cookie"));
  const { data: { user }, error } = await (await createClient()).auth.getUser();
  return NextResponse.json({
    pathname: "/account/auth-diagnostics",
    authCookieNames: cookieInfo.names,
    duplicateAuthCookieNames: cookieInfo.duplicateNames,
    unambiguousAuthCookieCount: cookieInfo.cookies.length,
    authenticated: Boolean(user && !error),
    authError: error?.code ?? (error ? "auth_error" : null),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
