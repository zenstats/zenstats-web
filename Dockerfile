# syntax=docker/dockerfile:1.7

# ---- Stage 1: Compile Tracker Script ----
FROM --platform=$BUILDPLATFORM node:22-alpine AS tracker-builder

ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry ${NPM_REGISTRY}

WORKDIR /build/tracker

COPY tracker/package.json tracker/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY tracker/compile.js .
COPY tracker/src ./src

RUN npm run deploy

# ---- Stage 2: Build Frontend ----
FROM --platform=$BUILDPLATFORM node:22-alpine AS frontend-builder

ARG NPM_REGISTRY=https://registry.npmmirror.com
ARG VITE_DATA_DOMAIN=localhost
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV VITE_DATA_DOMAIN=${VITE_DATA_DOMAIN}

RUN corepack enable && corepack prepare pnpm@10.13.1 --activate \
  && pnpm config set registry ${NPM_REGISTRY} \
  && pnpm config set store-dir /pnpm/store

WORKDIR /build

COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile --ignore-scripts --prefer-offline && pnpm rebuild

COPY . .
COPY --from=tracker-builder /build/tracker/dist /build/public/js

RUN pnpm build

# ---- Stage 3: Caddy Runtime ----
FROM --platform=$TARGETPLATFORM caddy:2-alpine

COPY --from=frontend-builder /build/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80 443 443/udp

ENTRYPOINT ["/entrypoint.sh"]
