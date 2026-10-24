<div align="center">
  <img src="https://tidelight.app/tidelight-mark.svg" alt="Tidelight" width="56" height="56" />
  <h1>@tidelight/mcp</h1>
  <p><strong>连接到 Tidelight 托管 MCP 服务的安全本地 stdio bridge。</strong></p>
  <p><a href="https://tidelight.app">产品</a> · <a href="https://dev.tidelight.app#mcp">连接指南</a> · <a href="https://github.com/TidelightOrg/tidelight">主仓库</a></p>
</div>

English version: [README.md](README.md)

---

此软件包将仅支持 stdio 的客户端发起的 MCP 发现和工具调用转发到经过身份验证的 Tidelight Streamable HTTP 服务。远程服务继续负责执行凭据、权限范围、配额和租户边界。

## 安装

```sh
npm install --global @tidelight/mcp@0.1.2
```

请使用 Node.js 22 或更高版本。创建项目 API 密钥时，只授予客户端所需的权限范围。

## 在主仓库中构建和测试

```sh
cd public/components/mcp/server
npm ci
npm test
npm run build
```

软件包测试套件会验证协议核心、按权限范围筛选的工具发现、远程 MCP 转发、安全端点校验，以及 API 密钥不会出现在工具结果或连接错误中。

## 运行 bridge

请使用 Node.js 22，这是软件包 CI 当前测试的运行时。创建带有 `market:read`、`research:run` 或两者权限范围的项目 API 密钥，然后通过本地密钥管理器或进程环境提供该密钥：

```sh
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
tidelight-mcp
```

安装后运行 `tidelight-mcp`。bridge 将 MCP 协议流量写入 stdout，将连接错误写入 stderr；不会打印 API 密钥。默认上游端点为 `https://mcp.tidelight.app/mcp`。自定义 `TIDELIGHT_MCP_URL` 必须使用 HTTPS；仅在本地测试时允许使用 loopback HTTP。

## 客户端配置

将支持 stdio 的 MCP 客户端指向已构建的 CLI。各客户端配置格式有所不同，以下仅展示通用命令结构，不是可直接复制的绝对路径：

```json
{
  "mcpServers": {
    "tidelight": {
      "command": "node",
      "args": ["/absolute/path/to/tidelight/public/components/mcp/server/dist/cli.js"],
      "env": {
        "TIDELIGHT_API_KEY": "YOUR_TIDELIGHT_PROJECT_KEY"
      }
    }
  }
}
```

请将密钥保存在客户端受保护的环境或密钥存储中。不要把真实凭据提交到客户端配置中。bridge 接受 API 密钥；兼容客户端也可以直接连接托管端点并使用 OAuth。

## 工具与访问权限

上游 Tidelight 服务只会返回当前密钥权限范围允许的工具。当前工具如下：

| 工具 | 权限范围 |
| --- | --- |
| `tidelight_search_tokenized_equities`、`tidelight_get_tokenized_equity` | `market:read` |
| `tidelight_start_company_research`、`tidelight_get_research_job`、`tidelight_cancel_research_job` | `research:run` |

工具结果会标识受支持的 Reality 代币化股票现货产品；这些不是直接持有的美国股票或股票永续合约。研究结果会保留来源背景，不会暴露私有模型推理内容。

## 已发布的容器镜像

官方容器镜像根据本仓库的 MCP server 源码构建，并发布到 GitHub Container Registry。该镜像与 npm 软件包使用相同的 stdio bridge；API 密钥仅在运行时提供，不会写入镜像。

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.2
```

请使用带有 `market:read`、`research:run` 或两者权限范围的项目密钥。对于支持 Docker stdio MCP server 的客户端，请将 `docker` 设为命令，并传入 `run`、`--rm`、`-i`、`-e`、`TIDELIGHT_API_KEY` 和 `ghcr.io/tidelightorg/tidelight-mcp:0.1.2` 作为参数；密钥应保存在客户端受保护的环境中。为确保部署可复现，请固定版本标签；`latest` 跟踪最近的主分支构建。

镜像支持 `linux/amd64` 和 `linux/arm64`。

## 库接口

协议服务器从软件包根目录导出。本地到远程的 bridge 可从 `@tidelight/mcp/proxy` 使用，并导出 `createTidelightMcpProxy({ apiKey, endpoint? })`、`validateTidelightMcpProxyOptions` 和 `DEFAULT_TIDELIGHT_MCP_URL`。完成经过身份验证的上游 MCP 初始化后，proxy 会解析为 `{ server, close }`；请将其中的 `server` 连接到客户端 transport，并在客户端会话结束时调用 `close()`。CLI 会处理这一完整生命周期以支持 stdio 客户端。

## 兼容性与问题排查

| 项目 | 当前支持 |
| --- | --- |
| 本地传输 | MCP stdio |
| 上游传输 | Streamable HTTP |
| 上游身份验证 | 使用 `TIDELIGHT_API_KEY` 环境变量的 Tidelight 项目 API 密钥 |
| 运行时 | 已测试 Node.js 22；软件包要求 Node.js 22+ |
| 第三方客户端 | 软件包测试不会对任何特定第三方客户端提供认证 |
| API 服务 | Tidelight MCP 服务与当前软件包协议测试兼容 |

- **没有显示工具：**确认密钥具有受支持的权限范围，并重新连接以让客户端重新执行工具发现。
- **未授权：**创建新的有效项目密钥，并确认客户端进程通过 `TIDELIGHT_API_KEY` 收到了该密钥。
- **上游不可用：**检查网络能否访问 `mcp.tidelight.app`；bridge 不会取代上游健康检查或授权。
- **工具调用被拒绝：**API 仍是权限、配额、服务商可用性和市场数据再分发条款的权威依据。
- **达到速率或配额限制：**遵循服务提供的重试指引，不要对工具调用添加无界重试。

## 发布与安全状态

版本变更遵循 SemVer。软件包源码和所含文档采用 Apache-2.0 许可证。请查看此目录中的 LICENSE 和 NOTICE。该授权仅适用于此软件包，不适用于专有应用、后端或主仓库中的其他路径。不要在示例、日志、问题报告或源代码管理中加入密钥。

请查看[托管 MCP 连接指南](https://dev.tidelight.app#mcp)和[软件包状态](https://tidelight.app/developers/packages)。npm 软件包已发布，版本为 0.1.2。软件包发布不代表已获得任何特定客户端的认证。
