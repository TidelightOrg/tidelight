import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured.");
  return createBrowserClient(url, key, {
    cookieOptions: process.env.NODE_ENV === "production" ? { domain: ".tidelight.app" } : {},
    auth: { experimental: { passkey: true } },
  });
}
