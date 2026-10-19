import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Share one verified Supabase user lookup across the root layout and the page
 * rendered in the same request. Repeating getUser() can race a rotating
 * refresh token and make one part of the tree render as signed out.
 */
export const getServerUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
});
