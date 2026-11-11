# Instrument identity

`lib/instrument-identity.ts` is the shared in-memory contract for one issuer exposure. It does not add a table or a migration. The three legs stay distinct: a US share ticker is not a Bitget Reality rToken, and neither is a US stock perpetual.

## Kinds

Canonical kinds are the decision-capsule names `us_equity`, `reality_token`, and `us_stock_perpetual`. Symbol patterns are the ones already enforced on capsule forecasts. Evidence-graph `reality_tokenized_spot` is the Reality spot leg and maps to `reality_token`. Stored names stay as they are:

| Stored name | Where it already lives | Canonical kind |
|---|---|---|
| `reality_tokenized_spot` | evidence graph `marketType` | `reality_token` |
| `tokenized_equity_spot` | TIC instrument type | `reality_token` |
| `rtoken` | `MarketAsset.kind`, TIC query `kind` | `reality_token` when `isReality` is true |
| `stock-perpetual` | strategy `assetKind` | `us_stock_perpetual` |
| `stock_perpetual` | TIC company snapshot and OpenAPI | `us_stock_perpetual` |

`getBitgetStockPerp` still stores `kind: "rtoken"` with `isReality: false`. `canonicalKindForMarketAsset` reads that pair as `us_stock_perpetual`. `rwa` and `crypto` are not part of this identity.

`linkCanonicalInstrument` requires the caller to name the leg. `RNVDAUSDT` matches both the Reality token pattern and the perpetual pattern. `NVDAUSDT` matches both `us_equity` and `us_stock_perpetual`. The symbol string does not choose the product.

`conventionalBitgetIdentity` spells the Bitget symbols the app already uses: `R{TICKER}USDT` and `{TICKER}USDT`. That spelling is not a listing, a quote, or permission to treat the legs as the same price. `getBitgetStockPerp` still accepts only `STOCK_PERP_UNIVERSE`.

## Freshness

`describeInstrumentFreshness` records the provider timestamp, the time it was evaluated, a stale window, and a future skew. The default window is 120 seconds, the value already on the Bitget market universe and in research quote gates. The default future skew is 60 seconds, the research quote gate. Nightwatch exit quotes keep a 5 second skew; pass `futureSkewMs: 5_000` to describe that observation. Status is `fresh`, `stale`, or `unverified`. A missing quote stays the caller's existing `unavailable` state.

Research, replay, and paper gates still apply their own checks. This increment does not replace them.

## Call sites

Decision-capsule forecast validation uses these symbol patterns instead of a second copy. Company snapshots use `canonicalKindForMarketAsset` for the existing Reality-spot and stored-perpetual filters. Response fields are unchanged.

## Open questions

1. Should `R{TICKER}USDT` and `{TICKER}USDT` be the canonical spellings, or should a leg exist only after the live Bitget catalog returns it? Agent Flow and the exposure map still spell the rToken inline.
2. Should `getBitgetStockPerp` stop storing `kind: "rtoken"`? Saved backtests and the company snapshot still read that string.
3. Should one freshness window replace the research 60 second skew and the Nightwatch 5 second skew, or do those stay separate?
4. Provider received time, timezone, session, currency, candle finality, and contract status are still the market-data contract in the roadmap. This descriptor does not include them.
5. Are ETFs in `STOCK_PERP_UNIVERSE`, such as QQQ, `us_equity`? The capsule pattern accepts them.
6. `BRK.B` fits `us_equity` and `reality_token` (`RBRK.BUSDT`) and does not fit `us_stock_perpetual`, because that pattern rejects the dot. What is the perpetual symbol?
7. GOOG and GOOGL are one issuer and two tickers. This identity is one underlying ticker, not an issuer id.
