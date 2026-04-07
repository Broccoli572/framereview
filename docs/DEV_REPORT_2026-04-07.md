# FrameReview V2 开发报告

**日期**：2026-04-07  
**部署**：Render (Web Service + PostgreSQL)  
**仓库**：https://github.com/Broccoli572/framereview  
**域名**：https://broccolis-video-system.onrender.com

---

## 一、今日完成工作

### 1. 后端全面补全（64 个新 API 端点）

重写了 `server/routes/` 全部 10 个路由文件，从骨架代码升级为功能完整的 REST API：

| 模块 | 文件 | 新增端点 | 核心功能 |
|------|------|---------|---------|
| **认证** | `auth.js` | +5 | Refresh Token（rotation 策略）、忘记/重置密码、个人资料更新、修改密码 |
| **工作区** | `workspaces.js` | +7 | 更新/删除工作区、成员 CRUD、邀请 CRUD、角色权限检查 |
| **项目** | `projects.js` | +8 | 直连路由 `/api/projects/:id`、归档/取消归档、活动日志、统计、复制项目 |
| **文件夹** | `folders.js` | +5 | 树形结构、内容列表、更新/移动、递归删除 |
| **素材** | `assets.js` | +10 | Multer 简单上传、分段上传（initiate/chunk/finalize）、列表/更新/删除/移动/批量操作、版本管理、缩略图、媒体处理 |
| **审片** | `reviews.js` | +5 | 路径对齐（`/assets/:id/threads`）、标记已解决/未解决、审批流程、评论 CRUD |
| **分享** | `shares.js` | +7 | 创建/更新/撤销分享链接、访问统计、访问记录、Token 验证 |
| **通知** | `notifications.js` | +4 | HTTP 方法 PATCH→POST 对齐前端、标记已读/全部已读、删除、通知偏好设置 |
| **搜索** | `search.js` | +4 | 搜索建议、最近搜索、清除历史、project_id 筛选、thread 类型搜索 |
| **管理** | `admin.js` | +9 | 用户 CRUD、工作区/项目列表、健康检查、系统设置 CRUD、活动日志筛选 |

### 2. Prisma Schema 更新

- 新增 `RefreshToken` 模型（支持 Token rotation 安全策略）
- 新增 `PasswordReset` 模型（支持安全的密码重置流程）
- `User` 模型新增 `metadata` JSON 字段（存储用户偏好设置）
- `User` 模型新增 `refreshTokens` / `passwordResets` 关联

### 3. React 前端集成

- **技术栈**：React 18 + Vite 5 + TailwindCSS + Zustand + React Query + React Router 6
- **页面**：登录/注册、忘记密码、仪表盘、工作区、工作区设置、项目详情、上传、审片播放器、搜索、管理后台、分享查看、404
- **UI 组件库**：18 个基础组件（Button, Card, Modal, Table, Pagination, Toast 等）
- **构建状态**：✅ `npm run build` 通过（2.08s，62 文件，0 错误）
- **前端修复**：authStore/client.js 响应格式对齐（`token` 替代 `access_token`）

### 4. 同源部署架构

- Express 同时 serve API + React SPA 静态文件
- SPA fallback：所有非 `/api` GET 请求返回 `index.html`（支持前端路由）
- 静态资源 1 年强缓存，HTML 不缓存
- 零 CORS 问题，API 走相对路径 `/api`
- Build 脚本自动化：`client install → vite build → prisma generate → db push`

### 5. server/index.js 增强

- 新增 `/uploads` 静态文件服务
- 新增 `/api/projects/:id` 直连路由
- 新增 `/api/projects/:projectId/shares` 和 `/api/assets/:assetId/shares` 子路由
- JSON body 限制从 10mb 提升到 100mb（支持大文件上传）
- 路由注册完整覆盖前端所有 API 调用

---

## 二、Git 提交记录

| Commit | 时间 | 说明 |
|--------|------|------|
| `0a4550d` | 17:37 | feat: add React frontend + complete backend API rewrite (64 endpoints) |
| `15c2c3f` | 17:48 | feat: serve React SPA from Express (same-origin deployment) |

**推送状态**：✅ 已全部推送到 `origin/master`，Render 自动部署中

---

## 三、系统架构总览

```
┌─────────────────────────────────────────────┐
│                  Render                     │
│  ┌───────────────────────────────────────┐  │
│  │           Express Server              │  │
│  │                                       │  │
│  │  /api/*  →  Route Handlers (10 files) │  │
│  │  /*      →  React SPA (client/dist)  │  │
│  │  /uploads →  Static Media Files       │  │
│  └──────────┬────────────────────────────┘  │
│             │                               │
│  ┌──────────▼────────────────────────────┐  │
│  │         PostgreSQL (Render)           │  │
│  │  14 models / 60+ tables              │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

---

## 四、当前状态与已知限制

### ✅ 已完成
- [x] 完整的 REST API（64 端点，覆盖认证/工作区/项目/文件夹/素材/审片/分享/通知/搜索/管理）
- [x] React 前端全部页面和组件
- [x] 同源部署（Express serve 前端 + API）
- [x] Prisma Schema + 数据库同步
- [x] JWT 认证 + Refresh Token rotation
- [x] 文件上传（Multer 简单上传 + 分段上传 API）
- [x] 前端构建通过，后端部署运行

### ⚠️ 待验证
- [ ] Render 部署后前端页面是否正常加载
- [ ] 前后端联调（注册/登录/创建工作区等核心流程）
- [ ] 文件上传到 Render 临时存储是否正常
- [ ] prisma db push 是否成功同步新表（RefreshToken、PasswordReset）

### 🚫 尚未开发
- [ ] **Media Worker** — 视频转码、缩略图提取、波形图生成、Sprite Strip
- [ ] **实时通知** — WebSocket / SSE 推送（目前只有轮询 API）
- [ ] **邮件通知** — 审片批注、分享邀请等邮件发送
- [ ] **对象存储** — S3/MinIO 集成（当前只有本地文件系统）
- [ ] **全文搜索** — Meilisearch 集成（当前只有 PostgreSQL LIKE 搜索）
