# ZenStats Web

ZenStats 的 Web 前端项目，一个简洁、直观的网站数据分析平台。

## ✨ 功能特性

- **用户认证**: 安全的登录和注册流程。
- **站点管理**: 添加和管理需要跟踪的网站。
- **数据可视化**: 使用图表和地图直观展示访客数据。
- **实时分析**: 查看实时访客统计信息。
- **响应式设计**: 在桌面和移动设备上均有良好体验。

## 🚀 技术栈

- **框架**: [React](https://react.dev/)
- **构建工具**: [Vite](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **UI 组件**: [shadcn/ui](https://ui.shadcn.com/)
- **CSS 框架**: [Tailwind CSS](https://tailwindcss.com/)
- **路由**: [React Router](https://reactrouter.com/)
- **状态管理**: [Zustand](https://zustand-demo.pmnd.rs/)
- **数据请求**: [Axios](https://axios-http.com/)
- **图表**: [ECharts](https://echarts.apache.org/) & [Recharts](https://recharts.org/)
- **代码规范**: ESLint & Prettier

## 📦 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) (>= 18.0.0)
- [pnpm](https://pnpm.io/) (推荐), `npm` 或 `yarn`

### 安装与启动

1.  **克隆仓库**
    ```bash
    git clone https://github.com/your-username/zenstats-web.git
    cd zenstats-web
    ```

2.  **安装依赖** (推荐使用 pnpm)
    ```bash
    pnpm install
    ```
    或者使用 npm / yarn:
    ```bash
    npm install
    # yarn install
    ```

3.  **启动开发服务器**
    ```bash
    pnpm dev
    ```
    项目将在 `http://localhost:5173` (或另一个可用端口) 上运行。

## 📜 可用脚本

- `pnpm dev`: 在开发模式下启动应用。
- `pnpm build`: 为生产环境构建应用。
- `pnpm preview`: 在本地预览生产构建。
- `pnpm lint`: 运行 ESLint 进行代码检查和修复。

## 📁 项目结构

```
/
├── public/          # 静态资源
├── src/
│   ├── assets/      # 图片、SVG等资源
│   ├── components/  # 通用 UI 组件
│   ├── constants/   # 全局常量
│   ├── lib/         # 工具函数 (如 cn)
│   ├── pages/       # 页面组件
│   ├── store/       # Zustand 状态管理
│   └── utils/       # 通用工具函数
├── vite.config.ts   # Vite 配置文件
└── package.json     # 项目依赖和脚本
```
