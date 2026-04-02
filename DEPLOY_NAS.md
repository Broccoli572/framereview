# FrameReview V2 — 绿联 NAS 部署指南

## 环境要求

- 绿联 NAS（UGREEN Boystack / UGOS）
- Docker / Container Station 已安装
- SSH 访问权限

---

## 第一步：配置 Docker 镜像源（解决 403 问题）

**问题原因**：绿联 NAS 默认使用 Aliyun 镜像加速器 `lvvdjw4a.mirror.aliyuncs.com`，该镜像站缓存已失效（403 Forbidden），导致 `composer:2` 等基础镜像拉取失败。

**解决方法**（二选一）：

### 方法 A：使用 DaoCloud 镜像加速（推荐）⭐

SSH 登录 NAS，执行：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": ["https://docker.m.daocloud.io"]
}
EOF
sudo systemctl restart docker
```

### 方法 B：关闭镜像加速，直连 Docker Hub

```bash
sudo tee /etc/docker/daemon.json <<'EOF'
{}
EOF
sudo systemctl restart docker
```

> **验证是否生效**：
> ```bash
> docker info | grep -i mirror
> # 应该看到 registry-mirrors 配置
> ```

---

## 第二步：上传项目到 NAS

在 NAS 上创建项目目录（与原版 video-hub 保持一致）：

```bash
# 通过 SCP / SMB 上传整个 video-hub-v2 目录到：
# /volume1/docker/video-hub-v2/

# 或者在 NAS SSH里 git clone：
git clone <你的Git仓库地址> /volume1/docker/video-hub-v2
```

---

## 第三步：配置环境变量

```bash
cd /volume1/docker/video-hub-v2

# 复制环境变量模板
cp .env.example .env

# 生成应用密钥（重要！）
docker-compose run --rm app php artisan key:generate

# 或者手动在 .env 中填写（APP_KEY留空时Laravel会自动生成）
```

编辑 `.env`，确认以下关键配置：

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=http://你的NASIP:8080

DB_PASSWORD=changeme      # 生产环境请使用强密码
REDIS_PASSWORD=null

# NAS 媒体存储路径（已在 docker-compose.yml 中挂载好）
MEDIA_ROOT=/nas/media
```

---

## 第四步：启动服务

```bash
cd /volume1/docker/video-hub-v2

# 拉取镜像 + 构建 + 启动（首次约需10-20分钟）
docker-compose up -d --build

# 查看启动状态
docker-compose ps

# 查看日志（排错用）
docker-compose logs -f app
```

**首次启动会自动执行**：
- `php artisan migrate` — 创建数据库表
- `php artisan db:seed` — 导入预置角色和演示账号

---

## 第五步：验证部署

| 服务 | 地址 | 说明 |
|------|------|------|
| 应用 | http://NASIP:8080 | 主界面 |
| MinIO Console | http://NASIP:9001 | 对象存储管理 |
| Meilisearch | http://NASIP:7700 | 全文搜索（需配置KEY） |

**默认账号**：
- 邮箱：`admin@framereview.local`
- 密码：`admin123`

**重建搜索索引**（启动后执行一次）：
```bash
docker-compose exec app php artisan search:reindex
```

---

## 常见问题

### Q: `403 Forbidden` 仍然出现
镜像配置未生效，重启 Docker：
```bash
sudo systemctl restart docker
# 或绿联 Container Station 重启 Docker 服务
```

### Q: `git was not found in the system`
这是 Docker build 过程中的无害警告，不影响构建结果，可忽略。

### Q: 数据库迁移失败
确认 PostgreSQL 已启动且 `.env` 中的 `DB_HOST=postgres` 正确：
```bash
docker-compose ps   # 确认 postgres 容器状态为 Up
docker-compose logs postgres  # 查看 PostgreSQL 日志
```

### Q: 媒体文件无法访问
确认 NAS 媒体目录路径正确，且 Docker 有权限访问：
```bash
ls -la /volume1/影像数据归档/小白Team内部影像数据/阅流视频存档/1KM
```

### Q: 想对接真实 MinIO / NAS SMB
编辑 `.env` 中的 `AWS_*` 相关配置，对接生产环境存储。

---

## 架构说明

```
┌──────────────────────────────────────────────────────┐
│  NAS (绿联)  /volume1/docker/video-hub-v2/           │
│                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  app        │  │  nginx      │  │ media-worker│ │
│  │  Laravel    │←→│  :8080      │  │ Node.js    │ │
│  └──────┬──────┘  └─────────────┘  └─────┬──────┘ │
│         │                                │          │
│  ┌──────▼──────┐                 ┌──────▼──────┐  │
│  │  postgres   │                 │  /nas/media  │  │
│  │  :5432      │                 │  (NAS存储)   │  │
│  └─────────────┘                 └─────────────┘  │
│  ┌─────────────┐  ┌─────────────┐                   │
│  │  redis      │  │  meilisearch│                   │
│  │  :6379      │  │  :7700      │                   │
│  └─────────────┘  └─────────────┘                   │
└──────────────────────────────────────────────────────┘
```
