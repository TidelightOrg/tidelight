import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBitgetAsset, getBitgetRealityTradeQuote } from "@/lib/bitget-market";
import { requiresMfa } from "@/lib/supabase/aal";
import { logSecurityEvent } from "@/lib/supabase/security-events";
import { isFreshNightwatchExitQuote } from "@/lib/nightwatch-exit-quote";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Sign in to close a paper position." }, { status: 401 });
  let body: { symbol?: unknown; reason?: unknown };
  try { body = await request.json() as typeof body; } catch { return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 }); }
  const symbol = typeof body.symbol === "string" ? body.symbol.toUpperCase() : "";
  if (await requiresMfa(supabase)) { await logSecurityEvent(supabase, user.id, "mfa_required", { action: "paper_exit", symbol }); return NextResponse.json({ code: "mfa_required", error: "Verify your authenticator before closing a paper position." }, { status: 403 }); }
  if (!/^[A-Z0-9]{2,24}USDT$/.test(symbol)) return NextResponse.json({ error: "Choose a valid Bitget Reality market." }, { status: 400 });
  let admin;
  try { admin = createAdminClient(); } catch { return NextResponse.json({ error: "Paper execution is temporarily unavailable." }, { status: 503 }); }
  const asset = await getBitgetAsset(symbol).catch(() => null);
  const quote = asset?.isReality ? await getBitgetRealityTradeQuote(symbol).catch(() => null) : null;
  if (!quote || !isFreshNightwatchExitQuote(quote.price, quote.providerTimestamp)) return NextResponse.json({ error: "A current, timestamped Bitget Reality fill is required for this paper exit." }, { status: 422 });
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 240) : "Manual paper exit";
  const { data, error } = await admin.rpc("nightwatch_close_from_server", { p_user_id: user.id, p_symbol: symbol, p_reference_price: quote.price, p_reason: reason, p_quote_timestamp: new Date(quote.providerTimestamp).toISOString() });
  if (error) return NextResponse.json({ error: error.message.includes("No open") ? error.message : "Could not close the paper position." }, { status: 409 });
  await logSecurityEvent(supabase, user.id, "paper_exit", { symbol });
  return NextResponse.json({ result: data, price: quote.price, quoteTimestamp: quote.providerTimestamp });
}
