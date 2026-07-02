# ZenStats Web

Frontend dashboard + Tracker JS SDK for ZenStats. Built with React 19 + TypeScript + Vite, shipped as a Caddy gateway Docker image.

## Tech Stack

- **Framework**: React 19, TypeScript
- **Builder**: Vite 7
- **UI**: Tailwind CSS 4, shadcn/ui
- **Charts**: ECharts + Recharts
- **Router**: React Router 6
- **State**: Zustand
- **i18n**: react-i18next

## Quick Start

```bash
git clone https://github.com/zenstats/zenstats-web.git
cd zenstats-web

pnpm install
pnpm dev          # http://localhost:5173
```

## Local Development

### Mock Mode (no backend required)

Built-in mock data for all API calls — no database or backend needed:

```bash
VITE_USE_MOCK=true pnpm dev
```

Navigate to `http://localhost:5173`, auto-login as Demo user. All pages (stats dashboard, funnel analysis, site settings, etc.) are browsable. Mock data is defined in `src/utils/mock.ts`.

### Connect to Local Backend

Ensure the backend is running on `localhost:8080` (see [zenstats/README.md](../zenstats/README.md) Quick Start):

```bash
pnpm dev     # Vite dev server, /api/* proxies to localhost:8080
```

Vite proxy config is in `vite.config.ts`, forwarding `/api`, `/swagger` and other paths to the backend.

### Full-Stack Development (recommended)

Use `zenstats-deploy` to start the complete backend stack with one command, develop the frontend separately:

```bash
# Terminal 1: Start backend stack (PG + CH + API + Caddy)
cd ../zenstats-deploy
cp .env.local .env
make local

# Terminal 2: Start frontend dev server
cd zenstats-web
pnpm dev          # → http://localhost:5173

# Or just start the databases and run the API on the host (for IDE debugging):
# make db-up
# cd ../zenstats && go run main.go server
```

## Project Structure

```
zenstats-web/
├── src/                # React app source
│   ├── pages/          # Page components (login, sites, stats, settings)
│   ├── components/     # Shared UI components
│   ├── store/          # Zustand state management
│   └── utils/          # Axios wrapper, utility functions
├── tracker/            # Tracker JS SDK
│   ├── src/            # Tracking script source
│   ├── compile.js      # 64-variant build script
│   └── dist/           # Build output (gitignored)
├── public/             # Static assets (compiled Tracker injected into public/js/)
├── Dockerfile          # Three-stage build (tracker → frontend → caddy)
├── Caddyfile           # Caddy gateway config (SPA + /js/ + /api/ proxy)
└── .gitea/             # CI workflows (multi-arch buildx → ghcr.io)
```

## Docker Image

```bash
docker build -t zenstats-web .
```

CI automatically builds multi-architecture images and pushes to `ghcr.io/zenstats/zenstats-web`.

The image includes:
- **Caddy 2** gateway (auto SSL, reverse proxy)
- **Tracker JS** 64 variants (`/js/script.js`, etc.)
- **SPA static files** (React admin panel)

## Tracker SDK

Tracker documentation: [docs/tracker.md](docs/tracker.md) (EN) / [docs/tracker_zh.md](docs/tracker_zh.md) (ZH)

## Deployment

This repository only handles frontend image builds. For full deployment, use [zenstats-deploy](https://github.com/zenstats/zenstats-deploy):

```bash
docker compose up -d   # auto-pulls frontend + API images
```

## License

**AGPL-3.0** — See [LICENSE.md](LICENSE.md) for details.
