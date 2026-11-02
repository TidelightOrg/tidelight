"use client";

import { useLanguage } from "@/app/ui/language-provider";
import { paperPositionStress } from "@/lib/paper-position-stress";

export default function PaperPositionStress({ direction, quantity, margin, mark, markAsOf, now }: { direction: "long" | "short"; quantity: number; margin: number; mark: number | null; markAsOf: number | null; now: number }) {
  const { language } = useLanguage();
  const zh = language === "zh-CN";
  const scenarios = paperPositionStress({ direction, quantity: Number(quantity), margin: Number(margin), referencePrice: mark ?? NaN, referenceTimestamp: markAsOf ?? NaN, now });
  if (!scenarios) return <p className="futures-method">{zh ? "价格压力情景不可用：需要最近 60 秒内的参考价格、有效数量和保证金。" : "Price stress unavailable: a reference price from the last 60 seconds, valid quantity and margin are required."}</p>;
  const money = (value: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(value);
  return <div className="futures-method" aria-label={zh ? "模拟仓位价格压力情景" : "Paper position price stress scenarios"}>
    <strong>{zh ? "不利价格情景" : "Adverse price scenarios"}</strong>
    <p>{zh ? `基准价格 ${money(mark!)} · ${new Date(markAsOf!).toLocaleString()}` : `Reference ${money(mark!)} · ${new Date(markAsOf!).toLocaleString()}`}</p>
    {scenarios.map(s => <p key={s.shock}>{zh ? `不利变动 ${(s.shock * 100).toFixed(0)}%：价格 ${money(s.stressedPrice)}，额外亏损 ${money(s.loss)}（保证金的 ${(s.marginFraction * 100).toFixed(1)}%）。` : `${(s.shock * 100).toFixed(0)}% adverse move: price ${money(s.stressedPrice)}, additional loss ${money(s.loss)} (${(s.marginFraction * 100).toFixed(1)}% of margin).`}</p>)}
    <p>{zh ? "仅为相对所示基准价格的假设损益；不包含费用、资金费率、滑点或交易所清算。" : "Hypothetical P&L relative to the displayed reference price; excludes fees, funding, slippage and exchange liquidation."}</p>
  </div>;
}
