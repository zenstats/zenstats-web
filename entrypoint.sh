#!/bin/sh
# ZenStats 前端容器启动脚本
# 在 Caddy 启动前，将 index.html 中的 __DATA_DOMAIN__ 占位符替换为实际的域名

set -e

DOMAIN="${ZENSTATS_DOMAIN:-localhost}"
INDEX_HTML="/srv/index.html"

if [ -f "$INDEX_HTML" ]; then
    # 使用 sed 替换占位符（兼容 Alpine 的 busybox sed）
    sed -i "s/__DATA_DOMAIN__/${DOMAIN}/g" "$INDEX_HTML"
    echo "[entrypoint] data-domain set to: ${DOMAIN}"
fi

# 启动 Caddy
exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
