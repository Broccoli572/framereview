#!/usr/bin/env bash
# deploy.sh — 远程部署到 NAS
# 用法: ./deploy.sh [user@host] [deploy_path]
# 示例: ./deploy.sh KM /volume1/docker/video-hub-v2

set -euo pipefail

REMOTE="${1:-}"
DEPLOY_PATH="${2:-}"

if [[ -z "$REMOTE" || -z "$DEPLOY_PATH" ]]; then
  echo "Usage: $0 <user@host> <deploy_path>"
  echo "Example: $0 KM /volume1/docker/video-hub-v2"
  exit 1
fi

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${DEPLOY_PATH}.bak.${TIMESTAMP}"

echo "=== FrameReview V2 Deployment ==="
echo "Remote: $REMOTE"
echo "Deploy path: $DEPLOY_PATH"

# 1. 备份旧部署
echo "[1/5] Backing up existing deployment..."
ssh "$REMOTE" "cp -r $DEPLOY_PATH $BACKUP_PATH 2>/dev/null || true"

# 2. 同步代码
echo "[2/5] Syncing code via rsync..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='vendor' \
  --exclude='node_modules' \
  --exclude='.env' \
  --exclude='storage/media/*' \
  ./ "$REMOTE:$DEPLOY_PATH/"

# 3. 安装 PHP 依赖
echo "[3/5] Installing PHP dependencies..."
ssh "$REMOTE" "cd $DEPLOY_PATH && composer install --no-dev --optimize-autoloader"

# 4. 运行迁移
echo "[4/5] Running migrations..."
ssh "$REMOTE" "cd $DEPLOY_PATH && php artisan migrate --force"

# 5. 重启容器
echo "[5/5] Restarting services..."
ssh "$REMOTE" "cd $DEPLOY_PATH && docker-compose down && docker-compose up -d --build"

echo "=== Deployment complete ==="
echo "Backup: $BACKUP_PATH"
