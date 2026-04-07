#!/bin/sh
# FrameReview V2 — Render Web Service 启动脚本

set -e

echo "[startup] Running migrations..."
php artisan migrate --force --no-interaction || true

echo "[startup] Clearing caches..."
php artisan config:cache --no-interaction 2>/dev/null || true
php artisan route:cache --no-interaction 2>/dev/null || true
php artisan view:cache --no-interaction 2>/dev/null || true

echo "[startup] Linking storage..."
php artisan storage:link --no-interaction 2>/dev/null || true

echo "[startup] Starting PHP-FPM..."
# Start PHP-FPM in background
php-fpm &

echo "[startup] Starting Nginx..."
exec nginx
