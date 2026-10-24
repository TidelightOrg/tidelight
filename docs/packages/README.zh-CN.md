# Tidelight 官方软件包

English version: [README.md](README.md)

`TidelightOrg/tidelight` 是规范的源代码仓库。首个公开软件包版本为 `0.1.2`（2026-10-18）。开发者中心从 npm 和 PyPI 读取当前版本，并链接到各注册表中的软件包。

## 已发布的软件包

| 软件包 | 源码 | 当前版本 | 安装 | 注册表 |
| --- | --- | ---: | --- | --- |
| TypeScript SDK | `sdk/typescript` | 0.1.2 | `npm install @tidelight/sdk` | [npm](https://www.npmjs.com/package/@tidelight/sdk) |
| MCP bridge | `public/components/mcp/server` | 0.1.2 | `npm install @tidelight/mcp` | [npm](https://www.npmjs.com/package/@tidelight/mcp) |
| Python SDK | `sdk/python` | 0.1.2 | `python -m pip install tidelight` | [PyPI](https://pypi.org/project/tidelight/) |
| React | `packages/react` | 0.1.2 | `npm install @tidelight/react` | [npm](https://www.npmjs.com/package/@tidelight/react) |
| CLI | `packages/cli` | 0.1.2 | `npm install @tidelight/cli` | [npm](https://www.npmjs.com/package/@tidelight/cli) |

为确保可复现安装，请在应用清单和锁文件中固定 `0.1.2`。不要在浏览器代码、公开仓库、客户端日志或共享 MCP 配置中暴露 Tidelight API 密钥；请使用可信服务器或受保护的进程环境。React 软件包使用服务器提供的客户端接口，不接受特权凭据。

## MCP 容器

可部署的 stdio MCP bridge 也以多架构 OCI 镜像发布在 GHCR。该镜像与 npm 软件包使用相同的规范 MCP 源码，并以非特权 `node` 用户运行。构建包含来源证明和 SBOM；API 密钥在容器运行时提供。

```sh
docker pull ghcr.io/tidelightorg/tidelight-mcp:0.1.2
export TIDELIGHT_API_KEY='YOUR_TIDELIGHT_PROJECT_KEY'
docker run --rm -i -e TIDELIGHT_API_KEY ghcr.io/tidelightorg/tidelight-mcp:0.1.2
```

镜像支持 `linux/amd64` 和 `linux/arm64`。为确保部署可复现，请固定版本标签；`latest` 跟踪主分支构建。查看 [GHCR 软件包](https://github.com/orgs/TidelightOrg/packages/container/package/tidelight-mcp) 和 [MCP 软件包说明](https://tidelight.app/developers/packages/mcp)。

## 软件包职责与安全

- SDK 负责类型化 HTTP 传输、分页、有界重试与超时、研究任务轮询以及受支持的 webhook 操作。
- MCP bridge 将托管且按权限范围筛选的服务接入 stdio 客户端。托管服务仍是授权和研究行为的权威来源。
- Python 软件包映射受支持的 REST 接口。React 仅包含适用于浏览器的 hooks 和 UI。CLI 使用 SDK，并在可用时使用受保护的操作系统凭据存储。
- API 合约记录在 `docs/tic-openapi.yaml`；目前未单独发布 API 合约软件包。
- 结果会保留来源背景，不会暴露私有模型推理内容。软件包示例仅供说明；实际市场覆盖和数据访问仍受账户权限范围及服务商条款限制。

## 发布与验证

受保护的手动 npm/PyPI 发布工作流位于 `.github/workflows/publish-packages.yml`。它会验证目标版本、构建并测试源码软件包、检查归档完整性和校验和，并仅在满足所需环境保护条件后发布。首个发布流程中，npm 使用已配置的 `NPM_TOKEN` 密钥，PyPI 使用 Trusted Publisher。发布产物和注册表哈希会与经过测试的工作流候选版本核对。

`.github/workflows/publish-mcp-container.yml` 会在拉取请求中测试 MCP 软件包和 Docker 启动流程；验证通过后，从 `main` 向 GHCR 发布 `0.1.2`、提交 SHA 和 `latest` 镜像标签。发布任务单独获得 `packages: write` 权限。容器 CI 会验证干净镜像构建，以及未提供密钥时的启动失败路径。

由注册表数据驱动的开发者中心接口每五分钟刷新 npm 和 PyPI 元数据。如果注册表查询失败，软件包页面会继续显示上次已知的发布版本，并明确标注不可用状态，不会虚构新版本。

## 后续维护

- 为后续发布配置 npm Trusted Publishing；只有在环境无法使用 npm OIDC 时，才保留令牌路径作为授权的备用方案。
- 定期检查软件包所有权、组织或团队访问权限、来源证明、依赖策略和注册表账户恢复流程。
- 根据已测试的发布版本维护 Node.js、Python、React、MCP 协议和 API 兼容性矩阵。
- 发布注明日期的破坏性变更迁移指南，并以规范仓库作为 npm、PyPI 和 GHCR 产物的唯一事实来源。
