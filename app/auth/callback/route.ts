import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeInternalRedirect } from "@/lib/auth/safe-redirect";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (user && !userError) {
        const next = safeInternalRedirect(url.searchParams.get("next"), url.origin);
        if (next) return NextResponse.redirect(new URL(next, url.origin));

        const isNew = Boolean(user.created_at && Date.now() - Date.parse(user.created_at) < 10 * 60 * 1000);
        return NextResponse.redirect(new URL(isNew ? "/settings?setup=username#profile" : "/overview", url.origin));
      }
    }
  }

  return NextResponse.redirect(new URL("/login?error=session", url.origin));
}
