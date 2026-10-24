<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight Python SDK</h1>
  <p><strong>Typed access to Tidelight Intelligence Cloud API v1.</strong></p>
  <p><a href="https://tidelight.app">Product</a> · <a href="https://dev.tidelight.app/api">API guide</a> · <a href="https://github.com/TidelightOrg/tidelight">canonical repository</a></p>
  <p><a href="README.zh-CN.md">简体中文版本 / Chinese README</a></p>
</div>

---

The official Python client supports tokenized-equity market listings, asynchronous company research jobs, and research webhooks. It preserves provider provenance, stable error codes, and request IDs while applying bounded timeouts and retries.

## Install

```sh
python -m pip install tidelight==0.1.2
```

Keep the project API key in trusted server code. Market calls require `market:read`; research calls require `research:run`; webhook calls require `alerts:manage`.

## Quickstart

```python
import os
from tidelight import Client

client = Client(os.environ["TIDELIGHT_API_KEY"])
page = client.list_tokenized_equities(limit=20, underlying_ticker="AAPL")

for instrument in page.data:
    print(instrument.symbol, instrument.underlying_ticker)
```

## Supported workflows

| Workflow | Scope | Client methods |
| --- | --- | --- |
| Tokenized-equity spot listings and pagination | `market:read` | `list_tokenized_equities`, `tokenized_equities` |
| Company research snapshots | `research:run` | `start_company_research`, `get_research_job`, `cancel_research_job`, `wait_for_research_job` |
| Research webhooks and delivery history | `alerts:manage` | `create_webhook`, `update_webhook`, `list_webhooks`, `list_webhook_deliveries` |

A tokenized-equity spot instrument is not a direct share or a stock perpetual. When provider terms block a market response, the SDK surfaces `provider_terms_unconfirmed` without retrying or substituting data.

## Reliability and security

The default request timeout is 10 seconds. Network errors, `429`, and transient `5xx` responses receive at most two bounded retries. Webhook mutations are not automatically retried because the API does not accept webhook idempotency keys. The default transport rejects redirects and restricts bearer credentials to `api.tidelight.app`.

Webhook creation and secret rotation return a one-time signing secret. **TODO: Persist** it in your approved secret manager immediately. Do not print it; it cannot be recovered by listing the endpoint.

## Build and test from source

```sh
python -m pip install -e ./sdk/python
PYTHONPATH=sdk/python/src python -m unittest discover -s sdk/python/tests -v
```

Canonical source lives in [`sdk/python`](https://github.com/TidelightOrg/tidelight/tree/main/sdk/python) in the canonical repository. The standalone [Python repository](https://github.com/TidelightOrg/tidelight-python) is a synchronized source mirror. Make source changes in the canonical repository.

## Further reading

- [API reference](https://dev.tidelight.app/api)
- [OpenAPI contract](https://github.com/TidelightOrg/tidelight/blob/main/docs/tic-openapi.yaml)
- [Changelog](./CHANGELOG.md)
- [Security policy](https://github.com/TidelightOrg/tidelight/security/policy)
