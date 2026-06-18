<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/ZenStats%20Web-%F0%9F%93%8A%20Analytics%20Dashboard-6C5CE7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cGF0aCBkPSJNMjAgM0wxIDMzbDE5LTEwIDE5IDEweiIgZmlsbD0iIzhCOEJGQiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjgiIGZpbGw9IiM2QzVDRTciLz48L3N2Zz4=&logoWidth=32">
    <img src="https://img.shields.io/badge/ZenStats%20Web-%F0%9F%93%8A%20Analytics%20Dashboard-6C5CE7?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgdmlld0JveD0iMCAwIDQwIDQwIj48cGF0aCBkPSJNMjAgM0wxIDMzbDE5LTEwIDE5IDEweiIgZmlsbD0iIzhCOEJGQiIvPjxjaXJjbGUgY3g9IjIwIiBjeT0iMjAiIHI9IjgiIGZpbGw9IiM2QzVDRTciLz48L3N2Zz4=&logoWidth=32" alt="ZenStats Web">
  </picture>
</p>

<h3 align="center">
  ZenStats Web — Analytics Dashboard (React SPA)
</h3>

<p align="center">
  The frontend dashboard for <a href="https://github.com/your-org/zenstats">ZenStats</a> — a self-hosted, privacy-first web analytics platform.
</p>

<p align="center">
  <em>This is a git submodule of the <code>zenstats/</code> monorepo.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?style=flat&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat&logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind-4-38BDF8?style=flat&logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/license-Apache%202.0-blue" alt="License">
</p>

---

## Features

| | Capability |
|---|---|
| 📊 **Dashboard** | Aggregate metrics (visitors, pageviews, visits, bounce rate, visit duration) |
| 📈 **Time Series** | Interactive main graph with period comparison (day/7d/14d/30d/custom) |
| 🔍 **Breakdown Explorer** | Drill down by page, source, country, browser, OS, device, screen size, etc. |
| 🗺️ **Geo Map** | World map visualization of visitor distribution |
| 🎯 **Goals & Funnels** | Convertion tracking and multi-step funnel analysis |
| 🚦 **Real-time** | Live visitor counter (last 30 minutes) |
| 🛡️ **Shield Rules** | Traffic filtering by IP, hostname, country, user-agent |
| 👥 **Team** | Multi-user management with role-based access, sub-accounts |
| 🔑 **API Keys** | Generate and manage REST API tokens |
| 🔧 **Site Settings** | General config, goals, funnels, import/export |
| 🌐 **i18n** | English and Chinese (zh-CN) UI |
| 🌓 **Dark Mode** | Automatic / light / dark theme |

---

## Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5.8](https://www.typescriptlang.org/)
- **Build**: [Vite 7](https://vite.dev/) + [SWC](https://swc.rs/)
- **UI**: [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Routing**: [React Router v6](https://reactrouter.com/) (BrowserRouter)
- **State**: [Zustand](https://zustand.docs.pmnd.rs/)
- **Charts**: [ECharts](https://echarts.apache.org/) + [Recharts](https://recharts.org/)
- **Maps**: [react-simple-maps](https://www.react-simple-maps.io/)
- **Forms**: [react-hook-form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **i18n**: [react-i18next](https://react.i18next.com/)
- **HTTP**: [Axios](https://axios-http.com/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Animation**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Date**: [date-fns](https://date-fns.org/) + [dayjs](https://day.js.org/)
- **Lint**: ESLint + Prettier

---

## Quick Start

```bash
# Prerequisites
# - Node.js >= 18
# - pnpm (recommended), npm, or yarn
# - The zenstats Go backend running on localhost:8080

# Install dependencies
pnpm install

# Start dev server (default: http://localhost:5173)
pnpm dev
```

The dev server proxies API requests to `localhost:8080` via Vite's proxy config.

### Using Mock Data

```bash
VITE_USE_MOCK=true pnpm dev
```

Runs the app with in-memory mock data — no backend needed for UI development.

---

## Build

```bash
pnpm build
```

> **Note**: The build command uses `tsc -b` (project references mode), **not** `tsc --noEmit`.
> The `-b` flag enables strict cross-project type checking that `--noEmit` doesn't trigger.
> Always validate types with `npx tsc -b` before committing.

---

## Scripts

| Script | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Type-check (`tsc -b`) + production build |
| `pnpm preview` | Preview production build locally |
| `pnpm lint` | Run ESLint |

---

## Project Structure

```
web/
├── public/                 # Static assets (served as-is)
│   └── js/                 # Tracker SDK compiled scripts (copied by Docker build)
├── src/
│   ├── components/         # Reusable UI components (shadcn/ui + custom)
│   ├── constants/          # Global constants
│   ├── i18n/               # Internationalization (en / zh-CN)
│   │   └── locales/        # Translation JSON files
│   ├── lib/                # Utility helpers (cn, api client, ...)
│   ├── pages/
│   │   ├── login/          # Login, forgot/reset password, setup wizard
│   │   ├── register/       # User registration
│   │   ├── sites/          # Site management
│   │   │   ├── stats/      # ⭐ Main analytics dashboard + breakdown explorer
│   │   │   ├── funnel-analysis/
│   │   │   ├── settings/   # General, goals, funnels, shields
│   │   │   ├── import/     # Data import
│   │   │   ├── apikeys/
│   │   │   ├── install.tsx # Tracker script installation guide
│   │   │   └── verify.tsx  # Domain verification
│   │   ├── settings/       # User account settings
│   │   ├── admin/          # Admin panel (users, groups, sites, system config)
│   │   ├── user/           # Sub-accounts, search engines, quota
│   │   └── 404.tsx         # Not found
│   ├── store/              # Zustand stores
│   ├── utils/              # Mock data, helpers
│   ├── App.tsx             # Root component + layout
│   ├── main.tsx            # Entry point
│   └── routes.tsx          # Route definitions (~40 routes)
├── index.html              # HTML entry (with self-tracking script)
├── vite.config.ts          # Vite configuration
├── tsconfig.json           # TypeScript config
└── package.json            # Dependencies & scripts
```

---

## Related

- [ZenStats Backend](https://github.com/zenstats/zenstats) — Go API server, ClickHouse analytics, PostgreSQL business data
- [ZenStats Tracker](https://github.com/zenstats/zenstats/tree/main/tracker) — Browser-side JS instrumentation SDK

---

## License

**Apache 2.0** — See [LICENSE](https://www.apache.org/licenses/LICENSE-2.0) for details.
