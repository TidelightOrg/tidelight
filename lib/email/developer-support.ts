import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isTidelightOperator } from "@/lib/auth/operator-access";
import { emailSubjectLine, escapeSupportHtml } from "@/lib/developer-support";
import { sendWithResend } from "./resend";

const requestedAdmins = ["muhammadabdulhameed787@gmail.com", "thedigitalabiola@gmail.com"];
const from = "Tidelight Developer Support <support@tidelight.app>";
const MAX_CONCURRENT_SUPPORT_EMAILS = 2;
const SUPPORT_EMAIL_BATCH_INTERVAL_MS = 1_000;

async function operatorRecipients(admin: SupabaseClient): Promise<string[]> {
  const recipients = new Set(requestedAdmins);
  // The same confirmed identities permitted by the existing operator policy
  // receive an alert. Do not include ticket content in the email itself.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not enumerate authorized support operators.");
    const users = data.users ?? [];
    for (const user of users) {
      if (user.email && user.email_confirmed_at && user.email.trim().toLowerCase().endsWith("@tidelight.app") && isTidelightOperator(user)) recipients.add(user.email.trim().toLowerCase());
    }
    if (users.length < 1000) break;
  }
  return [...recipients].sort();
}

function emailHtml(title: string, preview: string, href: string) {
  const safeTitle = escapeSupportHtml(title);
  const safePreview = escapeSupportHtml(preview);
  const safeHref = escapeSupportHtml(href);
  return `<!doctype html><html><body style="margin:0;background:#f1f3ed;padding:28px 12px;font-family:Arial,sans-serif;color:#152d26"><main style="max-width:560px;margin:auto;padding:28px;border:1px solid #dbe4d9;border-radius:20px;background:#fffefa"><p style="margin:0 0 12px;color:#13866c;font-size:11px;letter-spacing:2px;font-weight:bold">TIDELIGHT / DEVELOPER SUPPORT</p><h1 style="margin:0 0 12px;font-size:24px;letter-spacing:-1px">${safeTitle}</h1><p style="color:#536760;line-height:1.65">${safePreview}</p><a href="${safeHref}" style="display:inline-block;margin-top:10px;padding:13px 18px;border-radius:10px;background:#08785b;color:#fff;text-decoration:none;font-weight:bold">Open support inbox</a><p style="margin:24px 0 0;color:#819087;font-size:11px">Ticket messages stay inside the authenticated Tidelight support workspace.</p></main></body></html>`;
}

export async function notifySupportOperators({ admin, ticketId, subject, ecosystem, event, eventKey }: {
  admin: SupabaseClient; ticketId: string; subject: string; ecosystem: string; event: string; eventKey?: string;
}) {
  if (!process.env.RESEND_API_KEY) throw new Error("Support email is not configured.");
  const recipients = await operatorRecipients(admin);
  const href = `https://tidelight.app/operator/developer-support?ticket=${encodeURIComponent(ticketId)}`;
  let delivered = 0;
  for (let offset = 0; offset < recipients.length; offset += MAX_CONCURRENT_SUPPORT_EMAILS) {
    const batch = recipients.slice(offset, offset + MAX_CONCURRENT_SUPPORT_EMAILS);
    const results = await Promise.allSettled(batch.map((to) => sendWithResend({
      from,
      to,
      subject: emailSubjectLine(`${event}: ${subject}`),
      html: emailHtml(`${event} · ${subject}`, `A ${ecosystem} support ticket has a new ${event.toLowerCase()}. Sign in to review and reply.`, href),
      idempotencyKey: `developer-support:${ticketId}:${eventKey ?? event.toLowerCase().replace(/[^a-z0-9]+/g, "-")}:${to.toLowerCase()}`,
    })));
    delivered += results.filter(result => result.status === "fulfilled").length;
    if (offset + MAX_CONCURRENT_SUPPORT_EMAILS < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, SUPPORT_EMAIL_BATCH_INTERVAL_MS));
    }
  }
  return { total: recipients.length, delivered };
}

export async function notifySupportRequester({ admin, userId, ticketId, subject, eventKey }: {
  admin: SupabaseClient; userId: string; ticketId: string; subject: string; eventKey: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const to = data.user?.email;
  if (error || !to || !data.user?.email_confirmed_at) return;
  await sendWithResend({
    from, to, subject: emailSubjectLine(`Tidelight support replied: ${subject}`),
    html: emailHtml("A support reply is ready", "Sign in to your Tidelight support inbox to read the new reply.", `https://tidelight.app/developers/support?ticket=${encodeURIComponent(ticketId)}`),
    idempotencyKey: `developer-support:${ticketId}:reply:${eventKey}`,
  });
}
