# Alpha Factory experiment manifest

Every new Strategy Lab backtest stores an optional, versioned `experimentManifest` with the saved run and includes it in a public replay export. Existing runs remain readable and publishable; they retain their historical fields and are marked as predating manifests in the replay UI.

The manifest records the engine version and deployment revision when available, strategy key/version, exact market category and instrument, Bitget capture time, completed-candle window, train/holdout boundary, fees, slippage, leverage and funding treatment. The US stock perpetual model remains an unlevered price replay with funding excluded; a Reality spot run is labeled separately.

`dataset.fingerprint` uses SHA-256 over the ordered `ohlcv-v1` rows:

```text
[timestamp, open, high, low, close, volume-or-null, turnover-or-null]
```

`integrity.manifestDigest` is SHA-256 over the manifest fields excluding `integrity`, with object keys sorted recursively. Before publishing a newly manifested run, the server recomputes the dataset fingerprint and manifest digest and rejects altered or malformed archives. These digests detect mismatches; they are not a digital signature and do not prove that the original data provider or strategy result was truthful. An absent source revision is shown as “Not captured,” not inferred later.

The engine version must be incremented when signal calculation, split policy, or execution assumptions change in a way that can affect results. Strategy keys remain individually versioned. The manifest does not account for costs or risks its execution model explicitly excludes, including perpetual funding, leverage, margin, liquidation, dividends, and order-book impact.
