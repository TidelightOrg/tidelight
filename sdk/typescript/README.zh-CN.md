<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight TypeScript SDK</h1>
  <p><strong>以类型安全的方式访问 Tidelight Intelligence Cloud API v1。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

官方 TypeScript / JavaScript 客户端支持代币化股票行情列表、异步公司研究任务和研究 Webhook。客户端保留数据提供方来源与 API 错误上下文，并采用有界轮询、超时和重试。

## 安装

```sh
npm install @tidelight/sdk@0.1.2
```

请将项目 API 密钥保存在可信的服务器端代码中。切勿将密钥暴露在浏览器打包文件或客户端应用中。

## 快速开始

```ts
import { TidelightClient } from "@tidelight/sdk";

const client = new TidelightClient({ apiKey: process.env.TIDELIGHT_API_KEY! });
const page = await client.listTokenizedEquities({
  limit: 20,
  underlyingTicker: "AAPL",
});

for (const instrument of page.data) {
  console.log(instrument.symbol, instrument.underlying_ticker);
}
```

## 支持的工作流

| 工作流 | 所需权限范围 | 客户端方法 |
| --- | --- | --- |
| 代币化股票现货列表与分页 | `market:read` | `listTokenizedEquities`、`tokenizedEquities` |
| 公司研究快照 | `research:run` | `startCompanyResearch`、`getResearchJob`、`cancelResearchJob`、`waitForResearchJob` |
| 研究 Webhook 与投递记录 | `alerts:manage` | `createWebhook`、`updateWebhook`、`listWebhooks`、`listWebhookDeliveries` |

代币化股票现货交易工具并非直接持有的股票，也不是股票永续合约。行情数据是否可用取决于服务的数据提供方条款门控；客户端会原样返回该判断，不会编造替代数据。

## 可靠性与安全

默认请求超时时间为 10 秒。网络错误、`429` 和暂时性 `5xx` 响应默认最多进行两次有界重试。由于 API 不支持 Webhook 幂等键，Webhook 变更操作不会自动重试。错误对象保留 HTTP 状态、稳定的 API 错误代码和请求 ID，不会返回原始数据提供方响应正文或 API 密钥。

创建 Webhook 或轮换密钥时会返回一次性签名密钥。**请立即将其保存到获批的密钥管理器中。** 不要打印该密钥；之后无法通过列出端点找回。

## 从源代码构建与测试

```sh
npm ci
npm test
```

规范实现位于主仓库的 [`sdk/typescript`](https://github.com/TidelightOrg/tidelight/tree/main/sdk/typescript)。独立的 [TypeScript 仓库](https://github.com/TidelightOrg/tidelight-sdk)是同步的源代码镜像。请在主仓库中修改源代码。

## 延伸阅读

- [API 参考](https://dev.tidelight.app/api)
- [OpenAPI 契约](https://github.com/TidelightOrg/tidelight/blob/main/docs/tic-openapi.yaml)
- [更新日志](./CHANGELOG.md)
- [安全策略](https://github.com/TidelightOrg/tidelight/security/policy)
