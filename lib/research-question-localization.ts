export type ResearchQuestionLanguage = "en" | "zh-CN";

const chinesePatterns: Array<[RegExp, (ticker: string) => string]> = [
  [/^What changed for ([A-Z]{1,6}) since the latest evidence\?$/, (ticker) => `自最新证据以来，${ticker} 有哪些变化？`],
  [/^What are the key risks around ([A-Z]{1,6}) right now\?$/, (ticker) => `目前 ${ticker} 面临哪些主要风险？`],
  [/^Review recent evidence and market context for ([A-Z]{1,6})$/, (ticker) => `查看 ${ticker} 的近期证据和市场背景`],
  [/^Is the r([A-Z]{1,6}) market supported by current evidence\?$/, (ticker) => `当前证据是否支持 r${ticker} 市场？`],
];

export function localizeResearchSuggestion(question: string, language: ResearchQuestionLanguage): string {
  if (language !== "zh-CN") return question;
  for (const [pattern, translate] of chinesePatterns) {
    const match = question.match(pattern);
    if (match) return translate(match[1]);
  }
  return question;
}
