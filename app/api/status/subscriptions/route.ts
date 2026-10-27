import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWithResend } from "@/lib/email/resend";

export const dynamic = "force-dynamic";
const json = (body: object, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const validComponents = new Set(["Tidelight app","Developer docs","Package directory","REST API","Research job API","MCP server metadata","npm registry","Python package registry","Application database","Research job processing","Scheduled paper analysis","Webhook delivery","Email delivery"]);

function escapeHtml(value: string) { return value.replace(/[&<>"']/g, char => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[char]!); }

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json({ error: "Open this form from the Tidelight status page." }, 403);
  let body: unknown;
  try { body = await request.json(); } catch { return json({ error: "Check the email address and try again." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Check the email address and try again." }, 400);
  const input = body as { email?: unknown; components?: unknown; website?: unknown };
  if (typeof input.website === "string" && input.website) return json({ ok: true });
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter a valid email address." }, 400);
  const components = Array.isArray(input.components) ? [...new Set(input.components.filter((value): value is string => typeof value === "string" && validComponents.has(value)))] : [];
  if (Array.isArray(input.components) && input.components.length !== components.length) return json({ error: "One or more selected components are unavailable." }, 400);
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const admin = createAdminClient();
  const { error } = await admin.from("tic_status_subscriptions").upsert({
    email, token_hash: tokenHash, components, confirmed_at: null, unsubscribed_at: null, created_at: new Date().toISOString(),
  }, { onConflict: "email" });
  if (error) return json({ error: "Subscriptions are temporarily unavailable. Please try again later." }, 503);
  const origin = new URL(request.url).origin;
  const confirmUrl = new URL("/api/status/subscriptions/confirm?token=" + encodeURIComponent(token), origin).toString();
  try {
    await sendWithResend({
      from: process.env.STATUS_EMAIL_FROM || process.env.EMAIL_FROM || "Tidelight Status <status@tidelight.app>",
      to: email, subject: "Confirm Tidelight status updates",
      html: `<p>Confirm your subscription to Tidelight status updates.</p><p><a href="${escapeHtml(confirmUrl)}">Confirm subscription</a></p><p>If you did not request this, you can ignore this message.</p>`,
      idempotencyKey: "status-subscribe:" + tokenHash,
    });
  } catch {
    return json({ error: "Confirmation email could not be sent. Please try again later." }, 503);
  }
  return json({ ok: true, message: "Check your inbox to confirm the subscription." });
}
