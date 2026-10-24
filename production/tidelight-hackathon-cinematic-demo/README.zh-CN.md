# Tidelight 电影式演示的制作资料

English version: [README.md](README.md)

此目录包含为 Bitget AI Base Camp Hackathon S2 制作的公开桌面演示影片所需的完整资料，包括最终版 1080p 成片、旁白和定时字幕、Tide 角色原始文件、剪辑所用源媒体，以及可复用的录制与渲染脚本。

## 最终成片

`deliverables/Tidelight_Hackathon_Cinematic_Demo_1080p.mp4` 是已完成的 H.264/AAC 影片：1920×1080、16:9、60 fps，时长约 3:54。简洁字幕已烧录到成片中，并另行提供 SRT 和 ASS 文件。另附旁白音轨和原创氛围配乐。

## 目录内容

- `deliverables/` — 最终 MP4、旁白脚本及同步的 SRT/ASS 字幕。
- `assets/tide/` — 已保存的 Blender 场景、可编辑的 Blender Python 源码、透明背景主视觉渲染、概念参考图和动画主持人 Tide 片段。
- `assets/audio/` — 选定的 ElevenLabs 旁白、已授权的声音样本和原创氛围配乐。
- `assets/screenshots/` — 公开页面的代表性桌面截图。
- `production/clips/` — 录制的公开桌面画面，以及渲染脚本使用的已组装剪辑片段和卡片。
- `production/scripts/` — 可移植的 Playwright 录制辅助工具、Blender 动画渲染工具、标题卡源码、音频混音和最终组装脚本。
- `docs/` — 制作记录和研究笔记，包括未登录公开演示的内容范围限制。

此交付内容不包含生成帧序列、依赖缓存、重复媒体导出文件或凭据。原始美术作品由角色参考提供；Tide 的 Blender 场景和源码均已包含。此目录不含密码、交易所密钥、Supabase 密钥、ElevenLabs API 密钥或私人账户数据。

## 重新渲染影片

前置条件：安装支持 `libx264`、AAC 和 libass 的 FFmpeg。在此目录中运行：

```sh
bash production/scripts/render_final.sh
```

重建的母版会写入 `production/rebuilt/`。脚本使用随附的剪辑片段、字幕、旁白和配乐。如要从已保存的场景重新生成 Tide 的透明动画帧，请安装 Blender 并运行：

```sh
blender --background assets/tide/Tide_Original_3D_Asset.blend --python production/scripts/render_tide_anim.py
```

如要重新录制公开网站，请在 `production/` 中安装 Node.js 依赖（运行 `npm install`，然后运行 `npx playwright install chromium`），再运行一个 `capture:*` 脚本。脚本使用 1920×1080 桌面视口访问 `https://tidelight.app` 的公开页面；不会登录或提交交易。可设置 `TIDELIGHT_BASE_URL`、`PRODUCTION_DIR` 和 `CHROMIUM_EXECUTABLE` 来选择站点、输出目录和浏览器。

`production/scripts/generate_narration.py` 使用选定的声音 ID，并且只从环境中读取 `ELEVENLABS_API_KEY`。重新生成旁白会发送 API 请求，并可能消耗账户额度；已生成的音频已包含在本目录中。

## 产品画面的范围

影片使用 Tidelight 公开且未登录页面的真实桌面录制内容。影片不展示私人研究任务、已完成的认证策略回测、Nightwatch 账本条目、模拟成交或交易所执行。未执行任何真实交易。影片中的市场信息仅作为公开数据呈现，不保证流动性或执行结果。影片将 Strategy Lab 描述为历史回放，并在旁白中保留已记录的基准测试限制。

## 声音、音乐与使用范围

用户已确认，所选 ElevenLabs 声音已获准用于预期的黑客松提交。为保持制作连续性，目录中包含声音样本。氛围配乐是原创生成的制作素材。如需在本项目之外复用这些素材，请先查看适用的服务条款和提交规则。
