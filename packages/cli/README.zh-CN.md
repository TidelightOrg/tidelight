<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight 命令行工具</h1>
  <p><strong>安全地在终端中使用受支持的 Tidelight API 工作流。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app/api">API 指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

官方 Tidelight 命令行客户端支持 API v1 中可用的工作流。全局安装：`npm install --global @tidelight/cli@0.1.2`。

## 本地源代码设置

此 CLI 调用规范 TypeScript SDK，不会自行实现 HTTP 传输。先构建 SDK，再构建 CLI：

```sh
cd sdk/typescript && npm ci && npm test
cd ../../packages/cli
npm ci
npm test
node dist/bin.js --help
```

需要 Node.js 22 或更高版本。请使用仅含命令所需权限范围的 Tidelight 项目 API 密钥。可在开发者中心创建和撤销 API 密钥。

## 身份验证

`tidelight auth login` 会在不回显密钥的情况下读取密钥，并将其保存在操作系统凭证存储中（macOS Keychain、Windows Credential Manager 或 Linux Secret Service）。Linux 需要已解锁的 Secret Service 提供程序，例如 GNOME Keyring 或 KWallet。如果凭证存储不可用，可在当前进程或 Shell 中设置 `TIDELIGHT_API_KEY`；CLI 不会写入明文凭证文件。环境变量凭证优先于钥匙串。`auth status` 仅显示凭证来源，不显示密钥；`auth logout` 会删除钥匙串中的值，但不会修改 Shell 环境变量。

## 支持的命令

```sh
tidelight market instruments --ticker NVDA --limit 20
tidelight market instruments --json

tidelight research start NVDA
tidelight research start NVDA --wait --timeout-ms 120000
tidelight research get 00000000-0000-4000-8000-000000000000 --json
tidelight research cancel 00000000-0000-4000-8000-000000000000

tidelight webhooks list
tidelight webhooks create --name "Research alerts" --url https://example.com/tidelight --events research.job.completed
tidelight webhooks update 00000000-0000-4000-8000-000000000000 --rotate-secret
tidelight webhooks disable 00000000-0000-4000-8000-000000000000
tidelight webhooks deliveries --json
```

这些命令仅映射到现有 SDK 和 OpenAPI 契约：受支持的 Reality 代币化股票现货交易工具、异步公司研究任务和研究任务 Webhook。CLI 不会创建完整研究报告、策略、情景、实盘订单、账户、项目或密钥。权限范围、租户所有权、配额及数据提供方条款均以服务端为准。

研究请求默认生成 UUID 幂等键。如调用方需要在重试时沿用同一密钥，请使用 `--idempotency-key`。`--wait` 会轮询直至任务进入终态或达到有界超时时间；Ctrl-C 会停止本地轮询，而 `research cancel` 会明确请求服务端取消任务。

行情结果附带服务端返回的数据来源信息及代币化交易工具类型。`provider_terms_unconfirmed` 错误表示服务当前无法返回该行情；CLI 会显示服务端结果，不会替换为其他数据源。此错误不代表直接股票或永续合约价格。

创建 Webhook 或轮换密钥成功后，只会显示一次签名密钥。CLI 会向 stderr 输出提醒，且不会保存或自动重试变更操作。请立即将密钥复制到密钥管理器。请勿将包含密钥的输出写入日志。

## 错误与兼容性

如果 API 提供了相关信息，CLI 会显示 HTTP 状态、稳定的 API 错误代码和请求 ID。错误输出不会包含凭证值或原始数据提供方响应。暂时性重试行为由共享 SDK 提供。支持范围为 Node.js 22 及以上版本、匹配版本的 `@tidelight/sdk` 和 Tidelight 版本化 API v1。

## 发布与安全

请参阅[更新日志](./CHANGELOG.md)。

在主仓库运行 `npm run test:package-consumers` 可进行干净的使用者环境演练：脚本会在隔离项目中安装打包后的 CLI 及匹配的 SDK，检查已安装的 `--help`，并确认未认证研究命令会在发起网络请求前退出。该检查不会发布软件包。
