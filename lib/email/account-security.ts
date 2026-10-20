import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enqueueSecurityEmail } from "./nightwatch";
import { formatApproximateLocation, resolveApproximateLocation } from "./geolocation";

export type AccountAuthEvent = "new_login" | "new_signup";

function header(request: Request, name: string, limit: number) {
  return (request.headers.get(name) ?? "").replace(/[\r\n]/g, " ").trim().slice(0, limit);
}

function clientIp(request: Request) {
  const forwarded = header(request, "x-forwarded-for", 200).split(",")[0]?.trim();
  return (forwarded || header(request, "x-real-ip", 80) || "Unavailable").slice(0, 80);
}

function browserLabel(userAgent: string) {
  if (!userAgent) return "Browser details unavailable";
  const browser = userAgent.match(/(Edg|Chrome|Firefox|Version|Safari|OPR)\/[^\s)]+/i)?.[0];
  const os = userAgent.match(/(Windows NT [^;)]+|Android [^;)]+|iPhone OS [^;)]+|Mac OS X [^;)]+|Linux)/i)?.[0];
  return [browser, os].filter(Boolean).join(" · ").slice(0, 180) || "Browser details unavailable";
}

export async function queueAccountAuthNotice(input: { admin: SupabaseClient; userId: string; event: AccountAuthEvent; request: Request; at?: Date }) {
  const at = input.at ?? new Date();
  const userAgent = header(input.request, "user-agent", 300);
  const ip = clientIp(input.request);
  const location = await resolveApproximateLocation({ request: input.request, ip });
  const title = input.event === "new_signup" ? "Your Tidelight workspace is ready" : "We've noticed a new login";
  const body = input.event === "new_signup"
    ? `A new Tidelight workspace was created for your account.\n\nTime: ${at.toUTCString()}\nIP address: ${ip}\nLocation: ${formatApproximateLocation(location)}\nBrowser: ${browserLabel(userAgent)}\n\nIf you did not create this account, contact security@tidelight.app immediately.`
    : `We're notifying you by email of a new login to your Tidelight account.\n\nTime: ${at.toUTCString()}\nIP address: ${ip}\nLocation: ${formatApproximateLocation(location)}\nBrowser: ${browserLabel(userAgent)}\n\nIf you do not recognize this activity, review your account security and change your password.`;
  const eventKey = `security:${input.userId}:${input.event}:${at.toISOString().slice(0, 16)}`;
  const { error: eventError } = await input.admin.from("security_events").insert({ user_id: input.userId, event_type: input.event, metadata: { source: "auth_callback", ip_address: ip, user_agent: userAgent.slice(0, 300), location: { city: location.city, region: location.region, country: location.country, country_code: location.countryCode, source: location.source } } });
  if (eventError) throw new Error("auth_security_event_failed");
  await enqueueSecurityEmail({ admin: input.admin, userId: input.userId, eventKey, title, body });
  return { title, body, eventKey };
}
