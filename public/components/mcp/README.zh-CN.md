<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>Tidelight Intelligence Cloud MCP</h1>
  <p><strong>通过 Model Context Protocol 提供权限受限的研究与行情工具。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app#mcp">连接指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

---

将兼容的 MCP 客户端连接到托管的 Streamable HTTP 服务：

```text
https://mcp.tidelight.app/mcp
```

服务接受 Tidelight OAuth 访问令牌和有权限范围限制的开发者 API 密钥。OAuth 授权在 Tidelight 同意页面上批准，其权限不会超过绑定项目密钥的范围。可通过[受保护资源](https://mcp.tidelight.app/.well-known/oauth-protected-resource/mcp)和[授权服务器](https://mcp.tidelight.app/.well-known/oauth-authorization-server)端点获取发现元数据。

## 可用工具

| 工具 | 权限范围 | 用途 |
| --- | --- | --- |
| `tidelight_search_tokenized_equities` | `market:read` | 搜索受支持的 Reality 代币化股票现货交易工具 |
| `tidelight_get_tokenized_equity` | `market:read` | 按底层股票代码获取受支持的交易工具 |
| `tidelight_start_company_research` | `research:run` | 启动异步公司研究快照 |
| `tidelight_get_research_job` | `research:run` | 读取任务状态和已完成结果 |
| `tidelight_cancel_research_job` | `research:run` | 请求取消排队任务 |

这些工具返回代币化现货产品，不是直接持有的美国股票或股票永续合约。研究结果会保留来源背景；它们不是投资建议，也不会暴露私有模型思维链。服务仍会强制执行数据提供方条款和项目权限范围。

## 本地 stdio 中介程序

[`@tidelight/mcp`](https://www.npmjs.com/package/@tidelight/mcp) 软件包将仅支持 stdio 的客户端请求转发至托管服务。请安装当前版本，并通过客户端的受保护环境提供有限权限的密钥：

```sh
npm install --global @tidelight/mcp@0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
tidelight-mcp
```

此中介程序不会运行生产服务，也不会绕过身份验证、租户隔离、配额、数据提供方访问控制或运营控制。兼容的客户端可以直接连接托管端点并使用 OAuth。

## 源代码与验证

协议核心、本地中介程序和测试位于主仓库的 [`public/components/mcp`](https://github.com/TidelightOrg/tidelight/tree/main/public/components/mcp)。独立的 [MCP 仓库](https://github.com/TidelightOrg/tidelight-mcp)是生成的源代码镜像；请在主仓库中提出变更。

```sh
cd server
npm ci
npm test
npm pack --dry-run
```

这些测试验证协议实现和软件包行为，但不能证明某个具体第三方客户端已完整通过 OAuth、令牌刷新、调用和撤销流程。

## 相关资源

- [MCP 连接指南](https://dev.tidelight.app#mcp)
- [REST API 与 OpenAPI 契约](https://github.com/TidelightOrg/tidelight-api)
- [更新日志](./server/CHANGELOG.md)
- [容器软件包](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp)
