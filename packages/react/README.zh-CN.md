<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight React</h1>
  <p><strong>面向 Tidelight 市场研究的类型安全、易访问 React 集成。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

本 React 软件包提供类型化 Hook，以及适用于 Tidelight 市场和研究工作流的易访问、可主题化 UI 辅助组件。它封装官方 SDK 的类型化方法，不会重复实现 API 请求、授权、计费或研究逻辑。

安装：`npm install @tidelight/react@0.1.2 @tidelight/sdk@0.1.2 react react-dom`

## 本地开发

```sh
cd sdk/typescript && npm ci && npm test
cd ../../packages/react
npm ci
npm test
```

此软件包声明兼容 React 18 和 19，并使用当前 `@tidelight/sdk` 客户端接口提供类型。

## 安全边界

切勿在浏览器打包文件中使用 Tidelight API 密钥构造官方 SDK。`TidelightProvider` 接收结构兼容的客户端；请通过应用服务器路由或 Server Action 提供客户端，并将项目凭证保存在仅服务器可访问的配置中，再向已登录用户返回经过授权的结构化响应。在该边界处，请实现应用自己的用户身份验证、租户隔离、CSRF 防护和请求限制。React 软件包本身不会验证用户身份或存储凭证。

## Hook

- `useTidelightClient()` 返回 `TidelightProvider` 提供的客户端；若在 Provider 外调用，会抛出明确错误。
- `useTokenizedEquities(query)` 加载受支持的交易工具，取消过期请求，并提供数据、加载、错误和刷新状态。
- `useResearchJob(jobId, { pollIntervalMs })` 读取研究任务；轮询默认关闭，启用后会在任务进入终态时停止。
- `useStartCompanyResearch()` 提供 `start(ticker, idempotencyKey?)` 和 `cancel()`，并暴露请求、错误及加载状态。

`TokenizedEquityGrid` 组件展示数据提供方返回的交易工具，并提供加载、错误/重试和空状态。它会保留代币化股票现货产品与直接股票、永续合约之间的区别。导入 `@tidelight/react/styles.css` 使用默认的简洁样式，也可以覆盖文档所列的 `--tidelight-*` CSS 自定义属性。

## 示例

```tsx
import { TidelightProvider, TokenizedEquityGrid, useTokenizedEquities } from "@tidelight/react";
import "@tidelight/react/styles.css";

function MarketPanel() {
  const result = useTokenizedEquities({ underlyingTicker: "NVDA", limit: 20 });
  return <TokenizedEquityGrid
    instruments={result.data?.data ?? []}
    isLoading={result.isLoading}
    error={result.error?.message}
    onRetry={result.refresh}
  />;
}

// `applicationServerClient` 调用已认证的同源后端中介层。
// Tidelight 项目密钥必须保存在服务器端，切勿放入此浏览器打包文件。
export function App({ applicationServerClient }) {
  return <TidelightProvider client={applicationServerClient}><MarketPanel /></TidelightProvider>;
}
```

## 兼容性与支持范围

| 项目 | 支持范围 |
| --- | --- |
| React peer 版本 | React 18 和 19 |
| 运行环境 | 浏览器，或注入兼容传输层的 React 服务端 / 客户端应用 |
| API 操作 | SDK 代币化股票列表和公司研究任务方法 |
| 样式 | 可选 CSS 文件；支持自定义属性主题 |
| Peer 依赖 | `@tidelight/sdk`、React 18 或 19、React DOM 18 或 19 |

本软件包不提供托管式客户端凭证流程或浏览器直连 API。API 响应继续遵循 Tidelight 的权限范围、配额、数据提供方和数据可用性行为。重试行为由传入的服务器端 SDK 客户端决定。

## 错误与故障排查

- 缺少 Provider 时会抛出 `useTidelightClient must be used inside TidelightProvider.`。
- 请求失败会通过 Hook 的 `error` 返回；加载状态和先前数据会明确展示。
- 默认不启用轮询；如需启用，请将 `pollIntervalMs` 设为 1 至 30000 之间的值。
- 如果没有匹配的交易工具，网格会依据返回数组显示空状态；它不会编造交易工具。
- 如果后端中介层收到未经授权的请求，请检查用户会话与项目的授权映射，以及服务器端项目密钥配置。

## 发布与安全

发布历史请见[更新日志](./CHANGELOG.md)。请勿将凭证放入 UI 属性、错误消息、日志或示例中。
