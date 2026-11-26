<div align="center">

<a href="https://github.com/zenstats/zenstats-web">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="src/assets/logo-h-dark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="src/assets/logo-h.svg" />
    <img alt="ZenStats Web" src="src/assets/logo-h.svg" height="56" />
  </picture>
</a>

<p>Modern privacy-first analytics dashboard, built-in documentation, modular Tracker JS SDK, optional headless screenshot worker, and Caddy gateway.</p>

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

## Features

- **Real-Time Traffic & Comparison** — Multi-metric overview cards, period comparisons, real-time online visitors, dimensional breakdowns (sources, UTM, pages, geography, devices), and CSV export
- **Click & Scroll Heatmaps** — CSS-selector-anchored click heatmaps (desktop / tablet / mobile), fold & scroll-depth analysis, and integration with the optional `zenstats-web-screenshot` Chromium capture worker
- **Core Web Vitals** — Real-user `LCP`, `INP`, `CLS`, `FCP`, and `TTFB` tracking with P50/P75/P95 percentiles and Good / Needs Improvement / Poor health thresholds
- **User Flows & Conversion Funnels** — Interactive Sankey path visualization (2–4 steps) and ordered funnel step analysis
- **Custom Query v2 & Pinned Views** — Multi-dimensional query builder with nested boolean & behavioral filters, saved audience segments, and pin-to-dashboard query cards
- **Workspace & Access Control** — Site shields, webhook/email traffic alerts, scheduled reports, password-protected share links, RBAC sub-accounts, GA4 import, and built-in interactive documentation (`/docs`)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling & UI | Tailwind CSS 4 + shadcn/ui (Radix UI primitives) |
| Data Visualization | Recharts 3 + custom Sankey & Heatmap overlays |
| State & Routing | Zustand 5 + React Router 6 |
| i18n | react-i18next (English / 简体中文) |
| Production Gateway | Caddy (first-party proxy for SPA, API, and tracking scripts) |

---

## Modular Tracker JS SDK

The tracking script is compiled from `tracker/src/` into **256 modular variants** (8 toggleable feature flags: `ex`, `fd`, `ha`, `hm`, `ma`, `ol`, `pf`, `te`):

- **Default `script.js`**: ~6.2 KB minified (~2.6 KB gzipped) — cookieless pageviews, SPA history tracking, custom events (`zenstats('event', ...)`)
- **Optional Lazy Chunks**:
  - `heatmap.js` (~3.4 KB gzipped) — CSS selector click capture & scroll-depth beacons
  - `vitals.js` (~5.1 KB gzipped) — Google `web-vitals` instrumentation (`LCP`, `INP`, `CLS`, `FCP`, `TTFB`)
- **Variant Builder**: `node tracker/compile.js` generates all variant combinations plus `tracker/dist/manifest.json`

For all script options, attributes, and API usage, see [`docs/tracker.md`](docs/tracker.md) ([中文](docs/tracker_zh.md)) or visit `/docs` inside the running app.

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Local Development

```bash
pnpm install

# Start Vite dev server (proxies /api to http://localhost:8080)
pnpm dev

# Or develop UI offline with built-in mock data
VITE_USE_MOCK=true pnpm dev
```

### Build & Tracker Commands

```bash
# Type-check and build production bundle (compiles tracker + Vite dist/)
pnpm build

# Compile all 256 tracker script variants + lazy chunks
node tracker/compile.js

# Run ESLint
pnpm lint
```

Playwright end-to-end verification specs for the tracker variants live in `tracker/test/`.

---

## Project Structure

```text
zenstats-web/
├── src/
│   ├── api/                 # API clients (auth, stats, query v2, heatmaps, vitals, sites, admin)
│   ├── components/          # UI primitives (ui/), layout shell, shared charts & modals
│   ├── i18n/                # English & Simplified Chinese locale bundles
│   ├── pages/               # Route views (landing, login, sites, settings, share, admin, docs, user)
│   ├── stores/              # Zustand state stores (auth, theme, sidebar, sites)
│   └── types/               # TypeScript contracts matching Go API models
├── tracker/
│   ├── src/                 # Modular tracker source (core, heatmap, vitals, helpers)
│   ├── compile.js           # 256-variant compiler (8 feature flags)
│   ├── test/                # Playwright tracker test suite
│   └── dist/                # Compiled scripts & manifest (gitignored)
├── screenshot/              # Optional headless Chromium heatmap screenshot worker
├── docs/                    # Tracker markdown documentation (EN / ZH)
├── public/                  # Static logos & assets
├── Caddyfile                # Production Caddy reverse proxy configuration
├── Dockerfile               # Multi-stage image build (tracker → frontend → caddy)
└── entrypoint.sh            # Runtime container entrypoint
```

---

## Container Images

| Image | Description | Registry |
|---|---|---|
| **Web + Caddy Gateway** | Dashboard SPA + tracker assets + Caddy proxy | `ghcr.io/zenstats/zenstats-web` |
| **Heatmap Screenshot Worker** | Optional headless Chromium capture service | `ghcr.io/zenstats/zenstats-web-screenshot` |

---

## Related Repositories

- [zenstats](https://github.com/zenstats/zenstats) — Go API backend & ClickHouse/PostgreSQL engine
- [zenstats-deploy](https://github.com/zenstats/zenstats-deploy) — Docker Compose & Kubernetes deployment stacks

## License

**AGPL-3.0** — See [LICENSE.md](LICENSE.md).
