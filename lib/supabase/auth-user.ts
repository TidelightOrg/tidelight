import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decodeVerifiedAuthUser } from "@/lib/supabase/verified-auth-claims";
import { isTidelightOperatorEmail } from "@/lib/auth/operator-access";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const user = (await getServerAuthState()).user;
  if (!user || user.email_confirmed_at || !isTidelightOperatorEmail(user.email)) return user;

  // The signed access token does not always include email_confirmed_at.
  // Re-read only allowlisted operator identities from Auth before applying
  // the operator gate; never infer confirmation from the email claim alone.
  const admin = createAdminClient();
  const { data: { user: confirmedUser }, error } = await admin.auth.admin.getUserById(user.id);
  return error ? user : confirmedUser;
}
