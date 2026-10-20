import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** Share verified auth state across the root layout and the page rendered in one request. */
export const getServerAuthState = cache(async () => {
  const supabase = await createClient();
  // Diagnostic metadata only; authorization continues to depend on getUser().
  const { data: { session } } = await supabase.auth.getSession();
  const { data: { user }, error } = await supabase.auth.getUser();
  return {
    user: error ? null : user,
    errorCode: error?.code ?? null,
    errorName: error?.name ?? null,
    sessionPresent: Boolean(session),
    refreshTokenPresent: Boolean(session?.refresh_token),
  };
});

export async function getServerUser() {
  return (await getServerAuthState()).user;
}
