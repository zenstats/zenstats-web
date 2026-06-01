# ---- Frontend Build Stage ----
# Build context should be set to the zenstats-web directory
FROM node:20-alpine AS frontend-builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# Cache dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm build

# ---- Runtime Stage (Nginx) ----
FROM nginx:alpine

# 移除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 添加 SPA 配置（从 zenstats 项目复制）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制构建产物
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]