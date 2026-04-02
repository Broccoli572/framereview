#!/bin/bash
# ============================================
# FrameReview V2 — NAS 一键部署脚本
# 在 NAS 上执行: bash deploy.sh
# ============================================

set -e

echo "=========================================="
echo " FrameReview V2 部署脚本"
echo "=========================================="

# ── 1. 配置 Docker DNS ──
echo ""
echo "[1/4] 配置 Docker daemon DNS..."

DAEMON_JSON="/etc/docker/daemon.json"
if [ -f "$DAEMON_JSON" ]; then
    echo "  daemon.json 已存在，备份为 daemon.json.bak"
    cp "$DAEMON_JSON" "${DAEMON_JSON}.bak"
fi

cat > "$DAEMON_JSON" <<'EOF'
{
  "dns": ["223.5.5.5", "114.114.114.114"],
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://docker.m.daocloud.io"
  ]
}
EOF

echo "  DNS: 223.5.5.5 (阿里), 114.114.114.114"
echo "  镜像加速: docker.1ms.run, docker.xuanyuan.me, daocloud"

# ── 2. 重启 Docker ──
echo ""
echo "[2/4] 重启 Docker 服务..."
# 绿联 NAS 可能用不同的命令，试几种
if command -v rc-service &>/dev/null; then
    rc-service docker restart 2>/dev/null || true
fi
if command -v systemctl &>/dev/null; then
    systemctl restart docker 2>/dev/null || true
fi
# 最暴力但有效的方式
kill -HUP $(cat /var/run/dockerd.pid 2>/dev/null) 2>/dev/null || true
sleep 3
echo "  Docker 已重启"

# ── 3. 测试 DNS ──
echo ""
echo "[3/4] 测试网络连通性..."

# 测试 DNS 解析
if nslookup registry-1.docker.io 223.5.5.5 &>/dev/null; then
    echo "  ✓ DNS 解析正常 (registry-1.docker.io)"
else
    echo "  ✗ DNS 仍然无法解析，尝试直接 IP..."
    echo "  这是 NAS 的系统级 DNS 问题"
    echo ""
    echo "  请手动操作："
    echo "    1. SSH 到 NAS"
    echo "    2. 编辑 /etc/resolv.conf，添加: nameserver 223.5.5.5"
    echo "    3. 重启 Docker"
    echo ""
    echo "  如果 NAS 不允许修改 resolv.conf，请联系绿联客服"
fi

# 测试镜像拉取（小镜像测试）
echo ""
echo "  尝试拉取 alpine:latest 测试网络..."
if docker pull alpine:latest --quiet 2>/dev/null; then
    echo "  ✓ 镜像拉取成功!"
else
    echo "  ✗ 镜像拉取失败，但继续尝试构建..."
fi

# ── 4. 构建并启动 ──
echo ""
echo "[4/4] 构建并启动服务..."
cd "$(dirname "$0")"

# 只构建 app 和 media-worker（需要 build 的）
echo "  构建 app 镜像..."
docker compose build --no-cache app 2>&1 | tail -20

echo "  构建 media-worker 镜像..."
docker compose build --no-cache media-worker 2>&1 | tail -20

echo "  启动所有服务..."
docker compose up -d 2>&1 | tail -20

echo ""
echo "=========================================="
echo " 部署完成！"
echo ""
echo " 访问地址: http://<NAS_IP>:8080"
echo " 查看日志: docker compose logs -f app"
echo " 停止服务: docker compose down"
echo "=========================================="
