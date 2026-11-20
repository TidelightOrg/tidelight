import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { decodeVerifiedAuthUser } from "@/lib/supabase/verified-auth-claims";
import { isTidelightOperatorEmail } from "@/lib/auth/operator-access";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getServerAuthState() {
  const verifiedUser = decodeVerifiedAuthUser((await headers()).get("x-tidelight-verified-auth-user"));
  if (verifiedUser) return { user: verifiedUser, errorCode: null, errorName: null, errorStatus: null };

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return {
    user: error ? null : user,
    errorCode: error?.code ?? null,
    errorName: error?.name ?? null,
    errorStatus: typeof error?.status === "number" ? error.status : null,
  };
}

export async function getServerUser() {
  const user = (await getServerAuthState()).user;
  if (!user || user.email_confirmed_at || !isTidelightOperatorEmail(user.email)) return user;

  const admin = createAdminClient();
  const { data: { user: confirmedUser }, error } = await admin.auth.admin.getUserById(user.id);
  return error ? user : confirmedUser;
}
