import { after, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { drainEmailQueue } from "@/lib/email/delivery";
import { queueAccountAuthNotice } from "@/lib/email/account-security";
import { safeInternalRedirect } from "@/lib/auth/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (user && !userError) {
        const isNew = Boolean(user.created_at && Date.now() - Date.parse(user.created_at) < 10 * 60 * 1000);
        try {
          const admin = createAdminClient();
          await queueAccountAuthNotice({ admin, userId: user.id, event: isNew ? "new_signup" : "new_login", request });
          after(async () => {
            try { await drainEmailQueue(admin); }
            catch { console.error("Auth security email delivery deferred"); }
          });
        } catch { console.error("Auth security notice could not be queued"); }
        const next = safeInternalRedirect(url.searchParams.get("next"), url.origin);
        if (next) return NextResponse.redirect(new URL(next, url.origin));
        return NextResponse.redirect(new URL(isNew ? "/settings?setup=username#profile" : "/overview", url.origin));
      }
    }
  }
  return NextResponse.redirect(new URL("/login?error=session", url.origin));
}
