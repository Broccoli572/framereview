# FrameReview V2 — Render 部署指南

## 快速部署

### 1. 创建 Render 账号
- 访问 https://render.com 注册（可用 GitHub 账号）
- 连接 GitHub 仓库: https://github.com/Broccoli572/framereview

### 2. 一键部署（推荐）
- 点击上方 GitHub 仓库
- Render 会自动识别 `render.yaml` 并显示所有服务预览
- 点击 **"Apply"** 等待部署完成

### 3. 手动部署（可选）
- Dashboard → New → PostgreSQL → 创建 `framereview` 数据库
- Dashboard → New → Redis → 创建 `framereview-redis`
- Dashboard → New → Web Service（PHP）→ 关联 GitHub 仓库
  - Build Command: `composer install ...`
  - Start Command: `./start.sh`
  - 环境变量: 参考 `.env.example`
- Dashboard → New → Background Worker（Node）→ 关联仓库
  - Build Command: `cd media-worker && npm install ...`
  - Start Command: `cd media-worker && node src/index.js`

## 部署后检查清单

- [ ] 访问 `https://你的服务.onrender.com` 确认首页正常
- [ ] 登录后台（admin / admin123）
- [ ] 上传一个测试视频，确认处理队列正常
- [ ] 检查 Worker 日志是否有报错

## 媒体文件存储说明

Render 免费版 **没有持久化对象存储**。生产环境建议：
- 开通 **Render Persistent Disk**（$0.05/GB/月）
- 或接入 **AWS S3 / Cloudflare R2**（有免费额度）

当前配置媒体文件存在容器内 `/var/opt/media`，免费实例重启后会丢失。

## 环境变量参考

| 变量 | 说明 |
|------|------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_KEY` | `php artisan key:generate` 自动生成 |
| `DB_*` | Render PostgreSQL 自动注入 |
| `REDIS_*` | Render Redis 自动注入 |
| `MEDIA_ROOT` | `/var/opt/media` |

## 免费套餐限制

- Web Service: 750小时/月（休眠后不计）
- PostgreSQL Starter: 1GB 存储
- Redis Starter: 30MB 内存
- Worker: 与 Web Service 共用 512MB RAM

**注意**: Media Worker 需要较多内存，建议升级到 Starter Plan ($7/月)。
