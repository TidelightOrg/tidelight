import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { encodeVerifiedAuthUser } from "@/lib/supabase/verified-auth-claims";
import { resolveServiceHostRoute } from "@/lib/tic/service-host-routing";
import { excludeRefreshedAuthCookies, readSupabaseAuthCookieHeader, shouldMigrateSharedAuthCookies } from "@/lib/supabase/legacy-cookie-migration";
import { shouldVerifyProxyAuth } from "@/lib/supabase/proxy-auth-policy";

function notFound() {
  return NextResponse.json({ error: { code: "not_found", message: "This service path is not available." } }, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

function routeResponse(request: NextRequest): NextResponse {
  const route = resolveServiceHostRoute(request.nextUrl.hostname, request.nextUrl.pathname);
  const headers = new Headers(request.headers);
  headers.set("cookie", request.cookies.toString());
  const forwardedRequest = { request: { headers } };
  if (!route) return NextResponse.next(forwardedRequest);
  if (route.kind === "not-found") return notFound();
  else {
    const destination = request.nextUrl.clone();
    destination.pathname = route.pathname;
    return NextResponse.rewrite(destination, forwardedRequest);
  }
}

export async function proxy(request: NextRequest) {
  // Never trust an identity header supplied by the browser. It is populated
  // below only after Supabase has verified the request's signed access token.
  request.headers.delete("x-tidelight-verified-auth-user");
  const authCookieHeader = readSupabaseAuthCookieHeader(request.headers.get("cookie"));
  let response = routeResponse(request);
  const refreshedAuthCookieNames = new Set<string>();
  const refreshedCookieWriters: Array<(target: NextResponse) => void> = [];

  // Supabase SSR needs a request proxy to refresh expired access tokens and
  // persist the refreshed cookie before server components read the session.
  // Keep this on the primary app host, which owns the signed-in workspace.
  if (shouldVerifyProxyAuth(request.nextUrl.hostname, request.nextUrl.pathname) && authCookieHeader.duplicateNames.length === 0) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (supabaseUrl && supabaseKey) {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
              refreshedAuthCookieNames.add(name);
            });
            cookiesToSet.forEach(({ name, value, options }) => {
              refreshedCookieWriters.push((target) => target.cookies.set(name, value, options));
            });
          },
        },
      });
      // getClaims verifies the token and refreshes it when needed. Never use
      // getSession here: it trusts the cookie without validating the JWT.
      const { data, error } = await supabase.auth.getClaims();
      if (!error) {
        const verifiedUser = encodeVerifiedAuthUser(data?.claims);
        if (verifiedUser) request.headers.set("x-tidelight-verified-auth-user", verifiedUser);
      }
      response = routeResponse(request);
      refreshedCookieWriters.forEach((writeCookie) => writeCookie(response));
    }
  }

  // Older releases scoped Supabase refresh tokens to .tidelight.app, which
  // also sent them to docs.tidelight.app (GitBook). Migrate the same session
  // to the first-party app host, then expire the parent-domain cookie.
  if (shouldMigrateSharedAuthCookies(request.nextUrl.hostname)) {
    const secure = request.nextUrl.protocol === "https:";
    const authCookies = excludeRefreshedAuthCookies(authCookieHeader.cookies, refreshedAuthCookieNames);
    for (const { name, value } of authCookies) {
      response.cookies.set(name, value, { path: "/", sameSite: "lax", secure, httpOnly: false, maxAge: 400 * 24 * 60 * 60 });
    }
    // Always clear parent-domain copies. When a name is duplicated, leave the
    // first-party value untouched and skip auth refresh for this request.
    for (const name of authCookieHeader.names) {
      response.cookies.set(name, "", { domain: ".tidelight.app", path: "/", sameSite: "lax", secure, maxAge: 0, expires: new Date(0) });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
