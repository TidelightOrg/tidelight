/** Official starting points; these links help discovery but are not evidence until captured. */
const cikByTicker: Record<string, string> = { AAPL: "320193", AMZN: "1018724", MSFT: "789019", NVDA: "1045810", TSLA: "1318605" };
const issuerNews: Record<string, { label: string; url: string }> = {
  AAPL: { label: "Apple Newsroom", url: "https://www.apple.com/newsroom/" },
  AMZN: { label: "About Amazon News", url: "https://www.aboutamazon.com/news" },
  MSFT: { label: "Microsoft News", url: "https://news.microsoft.com/" },
  NVDA: { label: "NVIDIA Newsroom", url: "https://nvidianews.nvidia.com/" },
  TSLA: { label: "Tesla Investor Relations", url: "https://ir.tesla.com/press" },
};

export function getSourceStarters(ticker: string) {
  const symbol = ticker.toUpperCase();
  const company = issuerNews[symbol];
  const cik = cikByTicker[symbol];
  return [
    ...(company ? [{ label: company.label, url: company.url, kind: "Issuer" }] : []),
    ...(cik ? [{ label: "SEC company filings", url: `https://www.sec.gov/edgar/browse/?CIK=${cik}&owner=exclude`, kind: "Primary filing" }] : []),
  ];
}

/** Match source entry points to the question so a prior/default ticker is never shown for another topic. */
export function getResearchSourceStarters(question: string, fallbackTicker = "") {
  const normalized = question.toLocaleUpperCase("en-US");
  const companyAliases: Array<[string, RegExp]> = [
    ["NVDA", /\b(?:NVDA|NVIDIA)\b/], ["TSLA", /\b(?:TSLA|TESLA)\b/],
    ["MSFT", /\b(?:MSFT|MICROSOFT)\b/], ["AMZN", /\b(?:AMZN|AMAZON)\b/],
    ["AAPL", /\b(?:AAPL|APPLE)\b/],
  ];
  const matchedTicker = companyAliases.find(([, pattern]) => pattern.test(normalized))?.[0];
  const starters = matchedTicker ? getSourceStarters(matchedTicker) : [];
  const macro: Array<{ pattern: RegExp; starter: { label: string; url: string; kind: string } }> = [
    { pattern: /\b(?:FED|FEDERAL RESERVE|FOMC|POLICY RATE|RATE CUT|INTEREST RATE|MONETARY POLICY)\b/, starter: { label: "Federal Reserve · FOMC calendars and statements", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm", kind: "Central bank" } },
    { pattern: /\b(?:CPI|INFLATION|CONSUMER PRICE)\b/, starter: { label: "BLS · Consumer Price Index", url: "https://www.bls.gov/cpi/", kind: "Official statistics" } },
    { pattern: /\b(?:JOBS REPORT|EMPLOYMENT SITUATION|PAYROLLS|UNEMPLOYMENT)\b/, starter: { label: "BLS · Employment Situation", url: "https://www.bls.gov/news.release/empsit.toc.htm", kind: "Official statistics" } },
  ];
  for (const item of macro) if (item.pattern.test(normalized)) starters.push(item.starter);
  if (starters.length || question.trim()) return starters;
  return getSourceStarters(fallbackTicker);
}
