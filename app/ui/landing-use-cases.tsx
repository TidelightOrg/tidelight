"use client";

import Link from "next/link";
import { useState } from "react";
import { useLanguage } from "@/app/ui/language-provider";
import styles from "./landing-use-cases.module.css";

const categories = ["All use cases", "Company events", "Tokenized markets", "Macro context", "Decision workflows"] as const;
type Category = (typeof categories)[number];
const categoryGroups = categories.slice(1) as Array<Exclude<Category, "All use cases">>;

const zh: Record<string, string> = {
  "A CLEAR PLACE TO BEGIN": "清晰的起点",
  "Start with a market question.": "从一个市场问题开始。",
  "Choose a starting point. Tidelight opens the research desk with your question ready to refine.": "挑选一个起点。Tidelight 会打开预填问题的研究工作台，您可以继续编辑。",
  "Search use cases": "搜索用例", "Clear search": "清除搜索", "Filter use cases by category": "按类别筛选用例",
  "All use cases": "全部用例", "Company events": "公司事件", "Tokenized markets": "代币化市场", "Macro context": "宏观背景", "Decision workflows": "决策流程",
  "After-hours earnings": "盘后财报", "Check what changed after a company update and which evidence could change the reading.": "查看公司更新后有哪些变化，以及哪些证据可能改变判断。",
  "What changed for NVDA after its latest earnings, and which risks could alter the view?": "NVDA 最新财报发布后有哪些变化？哪些风险可能改变当前判断？",
  "Compare two companies": "比较两家公司", "Review recent evidence side by side while keeping each issuer’s risks distinct.": "并列审阅近期证据，同时分别呈现每家发行人的风险。",
  "Compare NVDA and TSLA using recent evidence and show the risks for each company.": "结合近期证据比较 NVDA 与 TSLA，并分别列出两家公司的风险。",
  "Company catalysts": "公司催化因素", "Gather current public catalysts and the uncertainties that still need a closer look.": "汇总当前公开催化因素，以及仍需进一步核实的不确定性。",
  "What are the latest public catalysts and key uncertainties for MSFT?": "MSFT 最新的公开催化因素和主要不确定性有哪些？",
  "Review a tokenized market": "审视代币化市场", "Separate issuer coverage from instrument context, quote freshness, and market limitations.": "区分发行人报道、交易工具背景、报价时效与市场限制。",
  "Is the rNVDA market worth reviewing? Separate issuer evidence from tokenized-market limits.": "rNVDA 市场是否值得审视？请区分发行人证据与代币化市场限制。",
  "Check quote freshness": "检查报价时效", "See whether the available quote context is current enough to support a market review.": "检查现有报价背景是否足够及时，能否支持市场审阅。",
  "Review current market context for rAAPL and flag stale or unavailable quotes.": "审阅 rAAPL 的当前市场背景，并标记过时或不可用的报价。",
  "Connect a macro event": "关联宏观事件", "Keep official economic facts separate from their possible market interpretation.": "将官方经济事实与其可能的市场解读分开。",
  "How might the latest Federal Reserve decision affect tokenized US equity markets? Separate facts from interpretation.": "Federal Reserve 最新决议可能如何影响代币化美股市场？请区分事实与解读。",
  "Review risk before a decision": "决策前审视风险", "Inspect supporting evidence, counterpoints, exposure, and the existing research gate.": "检查支持证据、反方观点、影响敞口与现有研究门槛。",
  "Review current evidence and risks for AAPL before I consider a paper strategy.": "在考虑模拟策略前，先审阅 AAPL 的当前证据与风险。",
  "Inspect a strategy idea": "检视策略思路", "Start with a research question, then continue to the strategy lab to test a rule on unseen data.": "从研究问题开始，然后前往策略实验室，用未见数据测试规则。",
  "What recent evidence and risks should I review for NVDA before testing a paper strategy?": "在测试模拟策略前，我应该审阅 NVDA 的哪些近期证据与风险？",
  "Open research path": "开始此研究流程", "No matching use cases": "没有匹配的用例", "Try another search or choose a different category.": "请尝试其他搜索词或选择其他类别。",
  "Show all use cases": "显示全部用例", "Every path begins with a question you can edit.": "每条流程都从一个可编辑的问题开始。", "Open the research desk": "打开研究工作台",
};

const useCases: Array<{ title: string; category: Exclude<Category, "All use cases">; description: string; question: string; mark: string }> = [
  { title: "After-hours earnings", category: "Company events", description: "Check what changed after a company update and which evidence could change the reading.", question: "What changed for NVDA after its latest earnings, and which risks could alter the view?", mark: "EV" },
  { title: "Compare two companies", category: "Company events", description: "Review recent evidence side by side while keeping each issuer’s risks distinct.", question: "Compare NVDA and TSLA using recent evidence and show the risks for each company.", mark: "VS" },
  { title: "Company catalysts", category: "Company events", description: "Gather current public catalysts and the uncertainties that still need a closer look.", question: "What are the latest public catalysts and key uncertainties for MSFT?", mark: "CA" },
  { title: "Review a tokenized market", category: "Tokenized markets", description: "Separate issuer coverage from instrument context, quote freshness, and market limitations.", question: "Is the rNVDA market worth reviewing? Separate issuer evidence from tokenized-market limits.", mark: "TK" },
  { title: "Check quote freshness", category: "Tokenized markets", description: "See whether the available quote context is current enough to support a market review.", question: "Review current market context for rAAPL and flag stale or unavailable quotes.", mark: "QT" },
  { title: "Connect a macro event", category: "Macro context", description: "Keep official economic facts separate from their possible market interpretation.", question: "How might the latest Federal Reserve decision affect tokenized US equity markets? Separate facts from interpretation.", mark: "MC" },
  { title: "Review risk before a decision", category: "Decision workflows", description: "Inspect supporting evidence, counterpoints, exposure, and the existing research gate.", question: "Review current evidence and risks for AAPL before I consider a paper strategy.", mark: "RK" },
  { title: "Inspect a strategy idea", category: "Decision workflows", description: "Start with a research question, then continue to the strategy lab to test a rule on unseen data.", question: "What recent evidence and risks should I review for NVDA before testing a paper strategy?", mark: "ST" },
];

const categoryNotes: Record<Exclude<Category, "All use cases">, { eyebrow: string; summary: string }> = {
  "Company events": { eyebrow: "ISSUER INTELLIGENCE", summary: "Earnings, comparisons, and catalysts" },
  "Tokenized markets": { eyebrow: "INSTRUMENT CONTEXT", summary: "Freshness, structure, and market limits" },
  "Macro context": { eyebrow: "MACRO SIGNALS", summary: "Official releases, clearly separated from interpretation" },
  "Decision workflows": { eyebrow: "DECISION SUPPORT", summary: "Counter-evidence before a paper decision" },
};

export default function LandingUseCases() {
  const { language } = useLanguage();
  const translate = (source: string) => language === "zh-CN" ? zh[source] ?? source : source;
  const [category, setCategory] = useState<Category>("All use cases");
  const [query, setQuery] = useState("");
  const visibleUseCases = useCases.filter((item) => {
    const matchesCategory = category === "All use cases" || item.category === category;
    const searchable = [item.title, item.category, item.description, item.question].map(translate).join(" ").toLocaleLowerCase();
    return matchesCategory && searchable.includes(query.trim().toLocaleLowerCase());
  });

  return <section className={styles.section} id="use-cases" aria-labelledby="landing-use-cases-title">
    <div className={styles.heading}>
      <div>
        <span className="landing-kicker"><i /> {translate("A CLEAR PLACE TO BEGIN")}</span>
        <h2 id="landing-use-cases-title">{translate("Start with a market question.")}</h2>
        <p>{translate("Choose a starting point. Tidelight opens the research desk with your question ready to refine.")}</p>
        <div className={styles.headingProof}><span><b>01</b> Source-led context</span><i/><span><b>02</b> Risks in view</span><i/><span><b>03</b> You stay in control</span></div>
      </div>
      <label className={styles.search}>
        <span className={styles.searchIcon} aria-hidden="true">⌕</span>
        <span className={styles.srOnly}>{translate("Search use cases")}</span>
        <input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder={translate("Search use cases")} />
        {query ? <button type="button" aria-label={translate("Clear search")} onClick={() => setQuery("")}>×</button> : null}
      </label>
    </div>
    <div className={styles.filters} role="group" aria-label={translate("Filter use cases by category")}>
      {categories.map((item) => <button type="button" key={item} className={category === item ? styles.active : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{translate(item)}</button>)}
    </div>
    <div className={styles.grid} aria-live="polite">
      {categoryGroups.map((group, groupIndex) => {
        const groupCases = visibleUseCases.filter((item) => item.category === group);
        if (!groupCases.length) return null;
        const note = categoryNotes[group];
        return <section className={styles.group} key={group} aria-labelledby={`use-case-group-${groupIndex}`}>
          <header className={styles.groupHead}><div><span>{String(groupIndex + 1).padStart(2, "0")} / {translate(note.eyebrow)}</span><h3 id={`use-case-group-${groupIndex}`}>{translate(group)}</h3></div><p>{translate(note.summary)}</p><span className={styles.groupCount}>{String(groupCases.length).padStart(2, "0")} PATHS</span></header>
          <div className={styles.groupGrid}>{groupCases.map((item, index) => <article className={styles.card} key={item.title}>
            <div className={styles.cardTop}><span className={styles.cardMark} aria-hidden="true"><span>{item.mark}</span><i/></span><span className={styles.index}>{String(index + 1).padStart(2, "0")}</span></div>
            <span className={styles.cardCategory}>{translate(item.category)}</span>
            <h4>{translate(item.title)}</h4>
            <p>{translate(item.description)}</p>
            <Link href={`/flow?question=${encodeURIComponent(translate(item.question))}`} aria-label={`${translate("Open research path")} — ${translate(item.title)}`}>
              {translate("Open research path")} <span aria-hidden="true">↗</span>
            </Link>
          </article>)}</div>
        </section>;
      })}
      {!visibleUseCases.length ? <div className={styles.empty}><b>{translate("No matching use cases")}</b><span>{translate("Try another search or choose a different category.")}</span><button type="button" onClick={() => { setQuery(""); setCategory("All use cases"); }}>{translate("Show all use cases")}</button></div> : null}
    </div>
    <div className={styles.foot}><span>{translate("Every path begins with a question you can edit.")}</span><Link href="/flow">{translate("Open the research desk")} <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
