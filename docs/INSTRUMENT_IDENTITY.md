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

There is no symbol-construction fallback for product identity. A Reality token is exposed only when the provider catalog marks a listed symbol as Reality spot and supplies its underlying ticker. Stock perpetuals remain limited to provider-confirmed members of `STOCK_PERP_UNIVERSE`. A familiar spelling is not proof of a listing.

## Freshness

`describeInstrumentFreshness` records the provider timestamp, the time it was evaluated, a stale window, and a future skew. The default window is 120 seconds, the value already on the Bitget market universe and in research quote gates. The default future skew is 60 seconds, the research quote gate. Nightwatch exit quotes keep a 5 second skew; pass `futureSkewMs: 5_000` to describe that observation. Status is `fresh`, `stale`, or `unverified`. A missing quote stays the caller's existing `unavailable` state.

Research, replay, and paper gates still apply their own checks. This increment does not replace them.

## Approved decisions · 17 November 2026

1. **Catalog confirmation:** only provider-returned instrument rows with a valid type and underlying may form a Reality or perpetual leg. Missing, stale, or ambiguous catalog data leaves the leg unavailable. Do not generate an rToken or perpetual symbol from a ticker.
2. **Stored types:** retain legacy `kind` strings in persisted rows for compatibility. Map them to canonical kinds at read boundaries; do not add a migration to rewrite history.
3. **Time windows:** preserve the 120 second quote stale window, the 60 second research future-skew allowance, and the 5 second Nightwatch future-skew allowance. Keep the windows separate until measurements support changing them. Record provider time and local receipt/evaluation time in UTC when a data contract supports both.
4. **Issuer identity:** use a normalized SEC CIK as the stable issuer ID when verified. Keep each ticker as a distinct instrument identity; GOOG and GOOGL may share an issuer ID while remaining separate equity instruments. Treat ETFs as US equity instruments with a fund issuer type when the issuer record confirms it. Never fabricate a CIK or mapping.
5. **Unsupported symbols:** do not infer a BRK.B perpetual symbol. Add it only after the provider catalog supplies an exact live contract and the model accepts its actual format.
6. **Persistence:** keep the identity contract in memory and reference existing run/source/instrument IDs. Add no identity or Decision Record table unless a demonstrated query or retention requirement cannot be served by the existing records.

Decision-capsule forecast validation uses these symbol patterns instead of a second copy. Company snapshots use `canonicalKindForMarketAsset` for the existing Reality-spot and stored-perpetual filters. Exposure lookup now requires the live catalog and does not fall back to a hard-coded product symbol. This increment does not unify separate quote, candle, TIC, evidence-graph, and strategy data models.

## Next implementation gate

The private saved strategy replay now captures a bounded, digest-checked observation of provider quote/receipt times, quote currency, provider contract status, session schedules, UTC candle timestamps, and the capture-clock candle-finality method. It remains separate from the existing public experiment manifest and is omitted from public replay exports until provider redistribution rights are confirmed. Unknown values remain `null`/unavailable; no values are inferred from a ticker or display name. Extending the same observation contract across Research and Paper Desk remains open and must preserve each workflow's current freshness gates.
