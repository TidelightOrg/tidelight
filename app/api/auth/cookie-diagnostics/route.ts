import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getServerAuthState } from "@/lib/supabase/auth-user";
import { readSupabaseAuthCookieHeader } from "@/lib/supabase/legacy-cookie-migration";

export const dynamic = "force-dynamic";

export async function GET() {
  const requestHeaders = await headers();
  const cookieInfo = readSupabaseAuthCookieHeader(requestHeaders.get("cookie"));
  const [sharedAuth, directAuth] = await Promise.all([getServerAuthState(), (await createClient()).auth.getUser()]);
  const user = directAuth.data.user;
  const error = directAuth.error;
  return NextResponse.json({
    pathname: "/api/auth/cookie-diagnostics",
    authCookieNames: cookieInfo.names,
    duplicateAuthCookieNames: cookieInfo.duplicateNames,
    unambiguousAuthCookieCount: cookieInfo.cookies.length,
    authenticated: Boolean(user && !error),
    sharedHelperAuthenticated: Boolean(sharedAuth.user),
    sharedHelperError: sharedAuth.errorCode,
    authError: error?.code ?? (error ? "auth_error" : null),
  }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
