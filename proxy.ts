import { NextResponse, type NextRequest } from "next/server";
import { resolveServiceHostRoute } from "@/lib/tic/service-host-routing";
import { isSupabaseAuthCookie, shouldMigrateSharedAuthCookies } from "@/lib/supabase/legacy-cookie-migration";

function notFound() {
  return NextResponse.json({ error: { code: "not_found", message: "This service path is not available." } }, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export function proxy(request: NextRequest) {
  const route = resolveServiceHostRoute(request.nextUrl.hostname, request.nextUrl.pathname);
  let response: NextResponse;
  if (!route) response = NextResponse.next();
  else if (route.kind === "not-found") response = notFound();
  else {
    const destination = request.nextUrl.clone();
    destination.pathname = route.pathname;
    response = NextResponse.rewrite(destination);
  }

  // Older releases scoped Supabase refresh tokens to .tidelight.app, which
  // also sent them to docs.tidelight.app (GitBook). Migrate the same session
  // to the first-party app host, then expire the parent-domain cookie.
  if (shouldMigrateSharedAuthCookies(request.nextUrl.hostname)) {
    const secure = request.nextUrl.protocol === "https:";
    for (const cookie of request.cookies.getAll()) {
      if (!isSupabaseAuthCookie(cookie.name)) continue;
      response.cookies.set(cookie.name, cookie.value, { path: "/", sameSite: "lax", secure });
      response.cookies.set(cookie.name, "", { domain: ".tidelight.app", path: "/", sameSite: "lax", secure, maxAge: 0, expires: new Date(0) });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
