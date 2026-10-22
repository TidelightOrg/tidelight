import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to view the private paper ledger." }, { status: 401, headers: { "Cache-Control": "no-store" } });

  const [account, runs, orders, positions, alerts] = await Promise.all([
    supabase.rpc("nightwatch_ensure_account").maybeSingle(),
    supabase.from("nightwatch_runs").select("id, symbol, signal, outcome, reason, as_of, reference_price, fast_sma, slow_sma, snapshot, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("nightwatch_orders").select("id, symbol, side, quantity, simulated_fill_price, notional, fee, realized_pnl, created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("nightwatch_positions").select("id, symbol, quantity, average_cost, opened_at"),
    supabase.from("nightwatch_alerts").select("id, kind, title, body, read_at, created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const failure = [account, runs, orders, positions, alerts].find((result) => result.error);
  if (failure?.error) {
    console.error("Nightwatch owner state could not be loaded", { code: failure.error.code });
    return NextResponse.json({ error: "Nightwatch could not load the private ledger. Refresh to retry." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const accountData = account.data as { cash_balance?: number | string; paused?: boolean } | null;

  return NextResponse.json({
    runs: runs.data ?? [], orders: orders.data ?? [], positions: positions.data ?? [], alerts: alerts.data ?? [],
    cashBalance: Number(accountData?.cash_balance ?? 10000), paused: accountData?.paused ?? false,
    updatedAt: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
