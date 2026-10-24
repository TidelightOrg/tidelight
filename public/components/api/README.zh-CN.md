<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight Intelligence Cloud API</h1>
  <p><strong>用于行情和研究工作流的版本化、权限范围 REST API。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

线上版本化 REST API 地址为 `https://api.tidelight.app/v1`。OpenAPI 3.1 契约发布于 [`openapi/tidelight.yaml`](openapi/tidelight.yaml)。

## 支持的操作

| 操作 | 权限范围 | 用途 |
| --- | --- | --- |
| `GET /market/instruments` | `market:read` | 列出受支持的 Reality 代币化股票现货交易工具；分页前可按 `underlying_ticker` 筛选 |
| `POST /research/jobs` | `research:run` | 启动异步、幂等的公司快照任务，发现最近 30 天的新闻 |
| `GET /research/jobs/{job_id}` | `research:run` | 在密钥所属项目范围内读取状态与结果 |
| `DELETE /research/jobs/{job_id}` | `research:run` | 取消排队任务或请求取消运行中的任务 |
| `GET, POST /webhooks` | `alerts:manage` | 列出或创建研究事件订阅 |
| `PATCH, DELETE /webhooks/{endpoint_id}` | `alerts:manage` | 更新、轮换密钥或停用项目端点 |
| `GET /webhooks/deliveries` | `alerts:manage` | 查看投递尝试和安全的失败详情 |

## 首个请求

创建开发者项目和带有 `market:read` 权限的测试密钥。请将密钥放入本地 Shell 环境；不要提交密钥、发送给不可信服务，或放入浏览器代码。

```sh
export TIDELIGHT_API_KEY='tl_test_…'
curl --fail-with-body \
  -H "Authorization: Bearer $TIDELIGHT_API_KEY" \
  -H 'Accept: application/json' \
  'https://api.tidelight.app/v1/market/instruments?kind=rtoken&underlying_ticker=AAPL&limit=10'
```

研究快照会围绕业绩、指引、监管、行业和供应链主题，执行八次有界新闻源搜索。系统筛选最近 30 天的新闻标题，并返回检索时间、发布方数量和原始链接。覆盖范围有上限；新闻标题和摘要仅用于发现线索，不代表完整文章分析。响应包含请求 ID 和行情来源信息，包括数据提供方及时间戳。rToken 现货交易工具是代币化产品，并非底层股票或股票永续合约。数据提供方不可用时，服务会返回安全错误，不会编造数值。在书面确认并配置行情再分发许可前，Bitget 行情响应会以 `503 provider_terms_unconfirmed` 拒绝提供。异步研究响应包含任务 ID；重试启动请求时，请复用同一个 `Idempotency-Key`。

错误响应包含稳定错误代码、安全消息和请求 ID。请遵守 `429` 配额限制；只有安全操作或幂等请求才应重试。所有请求与响应结构、状态码、限制以及 API 密钥身份验证要求均以 OpenAPI 契约为准。

## 服务端边界

本仓库发布 API 契约、客户端指南和验证工作流。已部署的服务端处理程序、凭证授权、租户隔离、配额、数据库函数、数据提供方集成和后台工作器由主仓库维护；本契约仓库不能作为 API 服务部署。线上服务由 Tidelight 现有应用部署提供。

请在[开发者控制台](https://tidelight.app/developers)创建有权限范围限制的凭证，并阅读完整的[开发者指南](https://dev.tidelight.app/api)。运行 `npm ci && npm test` 验证契约断言，然后按照工作流运行锁定版本的 OpenAPI 检查。本仓库由 `TidelightOrg/tidelight` 生成；请在主仓库中提出源代码变更。
