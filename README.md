# ZenStats Web

ZenStats 前端面板 + Tracker JS SDK。React 19 + TypeScript + Vite，Docker 构建 Caddy 网关镜像。

## 技术栈

- **框架**: React 19, TypeScript
- **构建**: Vite 7
- **UI**: Tailwind CSS 4, shadcn/ui
- **图表**: ECharts + Recharts
- **路由**: React Router 6
- **状态**: Zustand
- **国际化**: react-i18next

## 快速开始

```bash
git clone https://github.com/zenstats/zenstats-web.git
cd zenstats-web

pnpm install
pnpm dev          # http://localhost:5173
```

## 本地开发

### Mock 模式（无需后端，推荐前端开发首选）

所有 API 调用返回内置模拟数据，无需启动数据库或后端：

```bash
VITE_USE_MOCK=true pnpm dev
```

访问 `http://localhost:5173`，自动以 Demo 用户登录，所有页面（统计面板、漏斗分析、站点管理等）均可正常浏览。Mock 数据定义在 `src/utils/mock.ts`。

### 连接本地后端

确保后端已在 `localhost:8080` 运行（参考 [zenstats/README.md](../zenstats/README.md) 的 Quick Start）：

```bash
pnpm dev     # Vite 开发服务器，/api/* 请求代理到 localhost:8080
```

Vite 代理配置在 `vite.config.ts` 中，默认将 `/api`、`/swagger` 等路径转发到后端。

### 全栈开发（推荐）

使用 `zenstats-deploy` 一键启动完整后端栈，前端单独开发：

```bash
# 终端 1：启动后端栈（PG + CH + API + Caddy）
cd ../zenstats-deploy
cp .env.local .env
make local

# 终端 2：启动前端开发服务器
cd zenstats-web
pnpm dev          # → http://localhost:5173

# 或者仅启动数据库，在宿主机运行 API（方便 IDE 调试）:
# make db-up
# cd ../zenstats && go run main.go server
```

## 项目结构

```
zenstats-web/
├── src/                # React 应用源码
│   ├── pages/          # 页面组件 (login, sites, stats, settings)
│   ├── components/     # 通用 UI 组件
│   ├── store/          # Zustand 状态管理
│   └── utils/          # Axios 封装、工具函数
├── tracker/            # Tracker JS SDK
│   ├── src/            # 追踪脚本源码
│   ├── compile.js      # 64 变体编译脚本
│   └── dist/           # 编译产物 (gitignore)
├── public/             # 静态资源（Tracker JS 编译后注入到 public/js/）
├── Dockerfile          # 三阶段构建 (tracker → frontend → caddy)
├── Caddyfile           # Caddy 网关配置 (SPA + /js/ + /api/ 代理)
└── .gitea/             # CI 工作流（多架构 buildx → ghcr.io）
```

## Docker 镜像

```bash
docker build -t zenstats-web .
```

CI 自动构建多架构镜像推送到 `ghcr.io/zenstats/zenstats-web`。

镜像包含：
- **Caddy 2** 网关（自动 SSL、反向代理）
- **Tracker JS** 64 变体（`/js/script.js` 等）
- **SPA 静态文件**（React 管理面板）

## Tracker SDK

追踪脚本文档：[docs/tracker.md](docs/tracker.md) (EN) / [docs/tracker_zh.md](docs/tracker_zh.md) (中文)

## 部署

本仓库只负责前端镜像构建。完整部署请使用 [zenstats-deploy](https://github.com/zenstats/zenstats-deploy)：

```bash
docker compose up -d   # 自动拉取前端 + API 镜像
```

## License

**AGPL-3.0** — See [LICENSE.md](LICENSE.md) for details.
