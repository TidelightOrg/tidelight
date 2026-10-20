import { createClient } from "@/lib/supabase/server";

/** Read the verified user directly from the request's Supabase cookies. */
export async function getServerAuthState() {
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
