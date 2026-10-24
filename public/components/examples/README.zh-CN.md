<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight API 示例</h1>
  <p><strong>可运行的 REST 示例，明确展示权限范围、数据来源与服务边界。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

以下示例可调用线上 Tidelight Intelligence Cloud REST API。它们使用服务实际返回的数据；仓库中不包含 API 密钥或编造的行情数据。

| 文件 | 权限范围 | 示例内容 |
| --- | --- | --- |
| [`rest/market.mjs`](rest/market.mjs) | `market:read` | 使用原生 Node `fetch` 并处理带来源信息的响应 |
| [`rest/market.py`](rest/market.py) | `market:read` | 使用 Python 标准库发起请求 |
| [`rest/research.mjs`](rest/research.mjs) | `research:run` | 幂等地启动异步任务并进行有界轮询 |
| [`rest/research.py`](rest/research.py) | `research:run` | 启动 Python 研究任务、轮询并处理终态 |
| [`rest/market.sh`](rest/market.sh) | `market:read` | 最简 `curl` 请求 |

## 快速开始

在 Shell 中设置凭证。不要将凭证放入源文件、网页、命令行参数、共享日志或已提交的 `.env` 文件。

```sh
export TIDELIGHT_API_KEY='tl_test_…'
node rest/market.mjs
python rest/market.py
./rest/market.sh
```

研究示例可能启动数据提供方支持的任务并消耗配额。评估时请使用测试项目和测试密钥。脚本会输出 API 状态和请求 ID；它们会区分 `tokenized_equity_spot` 代币化股票现货交易工具与直接股票及永续合约，只展示服务实际返回的字段。

只有 API 的数据提供方条款门控允许时，才会返回行情数据。在配置再分发授权前，预期响应为 HTTP 503 `provider_terms_unconfirmed`。示例会显示该响应，不会用缓存或编造的数据代替。Python REST 示例会拒绝重定向，避免将持有者凭证转发至其他主机。

## 官方 SDK

- **TypeScript / JavaScript：** npm 上的 [`@tidelight/sdk`](https://www.npmjs.com/package/@tidelight/sdk) · [源代码](https://github.com/TidelightOrg/tidelight-sdk)
- **Python：** PyPI 上的 [`tidelight`](https://pypi.org/project/tidelight/) · [源代码](https://github.com/TidelightOrg/tidelight-python)
- **MCP：** npm 上的 [`@tidelight/mcp`](https://www.npmjs.com/package/@tidelight/mcp) · [源代码](https://github.com/TidelightOrg/tidelight-mcp)

规范实现和软件包清单位于 [Tidelight 主仓库](https://github.com/TidelightOrg/tidelight)。公开仓库是生成的源代码镜像；请在主仓库中提出变更。只有在源代码和使用者安装检查通过后，才会发布软件包。v0.1.2 协同版本同时更新了 TypeScript SDK、Python SDK、MCP 中介程序、React 集成和 CLI。

## 验证示例

```sh
npm ci
npm test
npm run test:python
```

测试使用模拟 HTTP 响应，验证身份验证、有界轮询、错误处理、在转发凭证前拒绝重定向，以及不会打印密钥。测试不会调用生产服务，也不会将模拟响应冒充为行情数据。

## 相关仓库

- [REST API 与 OpenAPI 契约](https://github.com/TidelightOrg/tidelight-api)
- [MCP 服务与本地中介程序](https://github.com/TidelightOrg/tidelight-mcp)
- [TypeScript SDK](https://github.com/TidelightOrg/tidelight-sdk)
- [Python SDK](https://github.com/TidelightOrg/tidelight-python)
- [主仓库](https://github.com/TidelightOrg/tidelight)
