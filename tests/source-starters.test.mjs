import test from "node:test";
import assert from "node:assert/strict";
import { getResearchSourceStarters, getSourceStarters } from "../lib/source-starters.ts";
import { validatePublicSourceUrl } from "../lib/public-source.ts";

test("each Mini company has an issuer source and a valid SEC filing entry point", () => {
  for (const ticker of ["AAPL", "AMZN", "MSFT", "NVDA", "TSLA"]) {
    const starters = getSourceStarters(ticker);
    assert.equal(starters.length, 2);
    assert.equal(starters[1].kind, "Primary filing");
    assert.ok(validatePublicSourceUrl(starters[0].url, ticker));
    assert.ok(validatePublicSourceUrl(starters[1].url, ticker));
    assert.match(starters[1].url, /CIK=\d{6,10}/);
  }
});

test("source starters follow the active question instead of a prior ticker", () => {
  const fed = getResearchSourceStarters("What did the Federal Reserve say about the September policy decision?", "NVDA");
  assert.equal(fed.length, 1);
  assert.equal(fed[0].kind, "Central bank");
  assert.match(fed[0].url, /federalreserve\.gov/);

  const inflation = getResearchSourceStarters("Review the CPI inflation release", "NVDA");
  assert.equal(inflation[0].kind, "Official statistics");
  assert.match(inflation[0].url, /bls\.gov\/cpi/);

  const mixed = getResearchSourceStarters("What could Fed policy mean for NVIDIA?", "TSLA");
  assert.ok(mixed.some((source) => /nvidianews/.test(source.url)));
  assert.ok(mixed.some((source) => /federalreserve/.test(source.url)));
  assert.deepEqual(getResearchSourceStarters("What is the latest on Ethereum?", "NVDA"), []);
});
