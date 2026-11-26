<div align="center">

<a href="https://github.com/zenstats/zenstats-web">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/logo-h-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="public/logo-h.svg" />
    <img alt="ZenStats Web" src="public/logo-h.svg" height="48" />
  </picture>
</a>

<p>隐私优先的现代网站分析控制台、内置交互文档、256 变体 Tracker JS SDK、可选截图 Worker 与 Caddy 网关。</p>

<p>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" alt="Vite 7" />
  <a href="LICENSE.md"><img src="https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square" alt="AGPL-3.0" /></a>
</p>

[English](README.md) · [简体中文](README.zh-CN.md)

</div>

---

## 核心功能

- **实时流量与趋势对比**：多指标概览卡片、周期同比、实时在线访客、多维细分列表（来源 / UTM / 页面 / 地理 / 设备）及 CSV 导出
- **点击与滚动热力图**：基于 CSS 选择器锚定的点击热力图（桌面 / 平板 / 移动视口）、首屏与滚动深度分布，支持搭配 `zenstats-web-screenshot` 无头截图服务
- **Core Web Vitals 性能监控**：真实用户 `LCP`、`INP`、`CLS`、`FCP`、`TTFB` 指标采集，支持 P50/P75/P95 分位数与健康度分级
- **用户流向与转化漏斗**：交互式桑基路径图（2–4 步流向与流失分析）及有序步骤转化漏斗
- **自定义查询 v2 与仪表板钉选**：支持嵌套布尔/行为过滤条件的自定义查询构建器、受众分群与仪表板钉选视图
- **团队协作与内置文档**：站点屏蔽规则、流量异常告警、定时邮件报告、密码保护共享链接、子账号 RBAC、GA4 数据导入及 `/docs` 内置文档

---

## 技术栈

| 层级 | 技术选型 |
|---|---|
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 7 |
| 样式与组件 | Tailwind CSS 4 + shadcn/ui (Radix UI) |
| 数据可视化 | Recharts 3 + 自定义桑基图与热力图叠加层 |
| 状态与路由 | Zustand 5 + React Router 6 |
| 国际化 | react-i18next（简体中文 / English） |
| 生产网关 | Caddy（SPA 托管、API 反代与第一方脚本分发） |

---

## 模块化 Tracker JS SDK

追踪脚本由 `tracker/src/` 按 **8 个功能开关（`ex`, `fd`, `ha`, `hm`, `ma`, `ol`, `pf`, `te`）编译为 256 种按需变体**：

- **默认 `script.js`**：约 6.2 KB（gzip 后约 2.6 KB）— 无 Cookie PV 统计、SPA 路由监听与自定义事件（`zenstats('event', ...)`）
- **按需懒加载模块**：
  - `heatmap.js`（gzip 约 3.4 KB）— CSS 选择器点击锚定与滚动深度上报
  - `vitals.js`（gzip 约 5.1 KB）— 基于 Google `web-vitals` 采集 `LCP` / `INP` / `CLS` / `FCP` / `TTFB`
- **变体构建**：运行 `node tracker/compile.js` 生成全量变体与 `tracker/dist/manifest.json`

完整参数说明请查阅 [`docs/tracker_zh.md`](docs/tracker_zh.md)（[English](docs/tracker.md)）或访问应用内置 `/docs` 页面。

---

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9

### 本地开发

```bash
pnpm install

# 启动 Vite 开发服务器（将 /api 代理至 http://localhost:8080）
pnpm dev

# 或启用内置 Mock 数据离线调试界面
VITE_USE_MOCK=true pnpm dev
```

### 构建与脚本编译

```bash
# 类型检查并构建生产产物（含 tracker 编译与 Vite dist/）
pnpm build

# 单独编译 256 个追踪脚本变体与懒加载分包
node tracker/compile.js

# 运行 ESLint 检查
pnpm lint
```

Tracker 端到端 Playwright 验证用例位于 `tracker/test/` 目录。

---

## 项目结构

```text
zenstats-web/
├── src/
│   ├── api/                 # API 客户端（认证、统计、Query v2、热力图、性能、站点、管理）
│   ├── components/          # UI 组件（shadcn/ui）、全局导航壳层、图表与弹窗
│   ├── i18n/                # 简体中文与英文语言包
│   ├── pages/               # 页面视图（首页、登录、站点分析、设置、共享页、管理后台、文档、个人中心）
│   ├── stores/              # Zustand 状态管理（认证、主题、侧边栏、站点）
│   └── types/               # 与 Go 后端对齐的 TypeScript 类型定义
├── tracker/
│   ├── src/                 # 模块化追踪源码（核心、热力图、性能指标、工具函数）
│   ├── compile.js           # 256 变体编译器（8 功能标志）
│   ├── test/                # Playwright 追踪脚本测试套件
│   └── dist/                # 编译产物与 manifest（gitignore）
├── screenshot/              # 可选无头 Chromium 热力图自动截图服务
├── docs/                    # 追踪脚本 Markdown 文档（中 / 英）
├── public/                  # 静态 Logo 与资源文件
├── Caddyfile                # 生产环境 Caddy 网关配置
├── Dockerfile               # 多阶段镜像构建（tracker → frontend → caddy）
└── entrypoint.sh            # 容器运行时入口脚本
```

---

## 容器镜像

| 镜像 | 说明 | 镜像地址 |
|---|---|---|
| **前端面板与网关** | 管理面板 SPA + 追踪脚本 + Caddy 网关 | `ghcr.io/zenstats/zenstats-web` |
| **热力图截图 Worker** | 可选无头 Chromium 页面截图采集服务 | `ghcr.io/zenstats/zenstats-web-screenshot` |

---

## 相关仓库

- [zenstats](https://github.com/zenstats/zenstats) — Go API 后端与 ClickHouse/PostgreSQL 分析引擎
- [zenstats-deploy](https://github.com/zenstats/zenstats-deploy) — Docker Compose 与 Kubernetes 部署编排

## License

**AGPL-3.0** — 详见 [LICENSE.md](LICENSE.md)。
