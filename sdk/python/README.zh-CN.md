<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight Python SDK</h1>
  <p><strong>以类型安全的方式访问 Tidelight Intelligence Cloud API v1。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

官方 Python 客户端支持代币化股票行情列表、异步公司研究任务和研究 Webhook。客户端保留数据提供方来源、稳定错误代码和请求 ID，并使用有界超时与重试。

## 安装

```sh
python -m pip install tidelight==0.1.2
```

请将项目 API 密钥保存在可信的服务器端代码中。行情请求需要 `market:read` 权限；研究请求需要 `research:run`；Webhook 请求需要 `alerts:manage`。

## 快速开始

```python
import os
from tidelight import Client

client = Client(os.environ["TIDELIGHT_API_KEY"])
page = client.list_tokenized_equities(limit=20, underlying_ticker="AAPL")

for instrument in page.data:
    print(instrument.symbol, instrument.underlying_ticker)
```

## 支持的工作流

| 工作流 | 所需权限范围 | 客户端方法 |
| --- | --- | --- |
| 代币化股票现货列表与分页 | `market:read` | `list_tokenized_equities`、`tokenized_equities` |
| 公司研究快照 | `research:run` | `start_company_research`、`get_research_job`、`cancel_research_job`、`wait_for_research_job` |
| 研究 Webhook 与投递记录 | `alerts:manage` | `create_webhook`、`update_webhook`、`list_webhooks`、`list_webhook_deliveries` |

代币化股票现货交易工具并非直接持有的股票，也不是股票永续合约。当数据提供方条款阻止行情响应时，SDK 会返回 `provider_terms_unconfirmed`，不会自动改用其他数据源。

## 可靠性与安全

默认请求超时时间为 10 秒。网络错误、`429` 和暂时性 `5xx` 响应最多进行两次有界重试。由于 API 不支持 Webhook 幂等键，Webhook 变更操作不会自动重试。默认传输层会拒绝重定向，并将承载令牌的请求限制到 `api.tidelight.app`。

创建 Webhook 或轮换密钥时会返回一次性签名密钥。**请立即将其保存到获批的密钥管理器中。** 不要打印该密钥；之后无法通过列出端点找回。

## 从源代码构建与测试

```sh
python -m pip install -e ./sdk/python
PYTHONPATH=sdk/python/src python -m unittest discover -s sdk/python/tests -v
```

规范实现位于主仓库的 [`sdk/python`](https://github.com/TidelightOrg/tidelight/tree/main/sdk/python)。独立的 [Python 仓库](https://github.com/TidelightOrg/tidelight-python)是同步的源代码镜像。请在主仓库中修改源代码。

## 延伸阅读

- [API 参考](https://dev.tidelight.app/api)
- [OpenAPI 契约](https://github.com/TidelightOrg/tidelight/blob/main/docs/tic-openapi.yaml)
- [更新日志](./CHANGELOG.md)
- [安全策略](https://github.com/TidelightOrg/tidelight/security/policy)
