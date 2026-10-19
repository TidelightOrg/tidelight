import { headers } from "next/headers";
import { getServerAuthState } from "@/lib/supabase/auth-user";

export const dynamic = "force-dynamic";

export default async function AccountAuthDiagnosticsPage() {
  const requestHeaders = await headers();
  const auth = await getServerAuthState();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "").split(",")[0].trim().toLowerCase();
  const authCookieNames = (requestHeaders.get("cookie") ?? "").split(";").map((part) => part.trim().split("=")[0] ?? "")
    .filter((name) => name.startsWith("sb-") && name.includes("-auth-token"));
  const standaloneDeveloperHost = host === "package.tidelight.app" || host === "blogs.tidelight.app";

  return <main className="content-wrap inner-page" style={{ padding: 32 }}>
    <p className="eyebrow">TEMPORARY AUTH DIAGNOSTIC</p>
    <h1>Account route auth state</h1>
    <pre>{JSON.stringify({ host, standaloneDeveloperHost, authenticated: Boolean(auth.user), authError: auth.errorCode, authCookieNames }, null, 2)}</pre>
  </main>;
}
