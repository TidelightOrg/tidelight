import type { SupabaseClient } from "@supabase/supabase-js";

export type SecurityEventType = "mfa_required" | "mfa_verified" | "control_change" | "paper_exit" | "passkey_signin" | "passkey_registered" | "passkey_removed" | "new_login" | "new_signup";

export async function logSecurityEvent(supabase: SupabaseClient, userId: string, eventType: SecurityEventType, metadata: Record<string, unknown> = {}) {
  await supabase.from("security_events").insert({ user_id: userId, event_type: eventType, metadata });
}
