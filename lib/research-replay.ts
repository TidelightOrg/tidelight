export type ResearchReplayEvent =
  | { kind: "question"; label: string; text: string }
  | { kind: "source"; label: string; publisher: string; title: string; captured_at: string; url: string; summary: string }
  | { kind: "claim"; label: string; text: string; polarity: "supporting" | "counterpoint"; source_ids: string[] }
  | { kind: "instrument"; symbol: string; category: string; state: "illustrative_unverified"; note: string }
  | { kind: "gate"; status: "not_run"; reasons: string[] };

export const researchReplay = {
  schema_version: "1.0.0",
  replay_id: "tidelight-demo-replay-001",
  title: "Illustrative after-hours research replay",
  mode: "fixture_not_live",
  created_at: "2026-10-20T00:00:00Z",
  notice: "This is a static UX fixture, not a live market event, verified source capture, model output, price quote, or trading recommendation. Use the live research path to run a real, authenticated workflow.",
  question: "A company releases material news after the US market close. What should I verify before reviewing its tokenized market?",
  events: [
    {
      kind: "question",
      label: "Research question",
      text: "Identify the event, verify it from primary sources, assess independent corroboration and counter-evidence, map the affected Bitget Reality instrument, and state what remains unknown."
    },
    {
      kind: "source",
      label: "Source checklist",
      publisher: "Primary issuer source required",
      title: "No source captured in this fixture",
      captured_at: "2026-10-20T00:00:00Z",
      url: "https://www.sec.gov/edgar/search/",
      summary: "Open the relevant filing or issuer release and capture its actual URL and publication timestamp in a live research run."
    },
    {
      kind: "claim",
      label: "Verification rule",
      text: "Do not treat the event as verified until the primary source is captured and its claim is matched to an excerpt.",
      polarity: "supporting",
      source_ids: ["primary-source-checklist"]
    },
    {
      kind: "claim",
      label: "Counterpoint",
      text: "A single issuer statement is not independent corroboration; seek a second source and actively look for contradictory information.",
      polarity: "counterpoint",
      source_ids: ["independent-corroboration-checklist"]
    },
    {
      kind: "instrument",
      symbol: "rTICKER",
      category: "Bitget Reality",
      state: "illustrative_unverified",
      note: "Replace the placeholder only after matching the provider instrument metadata and confirming quote freshness."
    },
    {
      kind: "gate",
      status: "not_run",
      reasons: [
        "No live source retrieval occurred.",
        "No instrument or quote was verified.",
        "No research or trading gate was executed.",
        "No paper order or fill exists in this fixture."
      ]
    }
  ]
} as const;
