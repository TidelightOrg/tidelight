import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decodeVerifiedAuthUser } from "@/lib/supabase/verified-auth-claims";

/** Read the verified user identity forwarded by Proxy, or verify cookies directly. */
export async function getServerAuthState() {
  const verifiedUser = decodeVerifiedAuthUser((await headers()).get("x-tidelight-verified-auth-user"));
  if (verifiedUser) return { user: verifiedUser, errorCode: null, errorName: null };

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return {
    user: error ? null : user,
    errorCode: error?.code ?? null,
    errorName: error?.name ?? null,
  };
}

export async function getServerUser() {
  return (await getServerAuthState()).user;
}
