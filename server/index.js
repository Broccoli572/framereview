import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';
import projectRoutes, { directRouter as projectDirectRoutes } from './routes/projects.js';
import folderRoutes from './routes/folders.js';
import assetRoutes from './routes/assets.js';
import shareRoutes from './routes/shares.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import searchRoutes from './routes/search.js';
import adminRoutes from './routes/admin.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render / reverse proxy deployments (required by express-rate-limit)
app.set('trust proxy', 1);
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CLIENT_DIST = join(__dirname, '../client/dist');

// ── Global BigInt serialization fix ─────────────────────
// Prisma returns BigInt for sizeBytes etc., but JSON.stringify can't serialize it.
// This monkey-patches res.json to convert all BigInt values to Number before stringifying.
app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function (data) {
    return originalJson(JSON.parse(JSON.stringify(data, (_key, value) =>
      typeof value === 'bigint' ? Number(value) : value
    )));
  };
  next();
});

// ── Middleware ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = [
      'http://localhost:5173',
      'https://broccolis-video-system.onrender.com',
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // 开发阶段允许所有来源
    }
  },
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ── Prisma ───────────────────────────────────────────────
export const prisma = new PrismaClient();

// ── Static files (uploads) ──────────────────────────────
app.use('/uploads', express.static(UPLOAD_DIR));

// ── Routes ────────────────────────────────────────────────
// NOTE: More specific routes MUST be registered before generic /:param routes
// to prevent greedy matching (e.g., /projects/:id must not swallow /projects/:id/assets)
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/projects', projectRoutes);
// Project-scoped sub-resources (must be BEFORE generic /api/projects/:id)
app.use('/api/projects/:projectId/assets', assetRoutes);
app.use('/api/projects/:projectId/folders', folderRoutes);
// Generic project routes (/:id would otherwise greedily match sub-resource paths)
app.use('/api/projects', projectDirectRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 调试端点（仅开发阶段，后续删除）
app.get('/api/debug/assets', async (req, res) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      // 返回所有 assets 的摘要
      const allAssets = await prisma.asset.findMany({
        select: { id: true, name: true, projectId: true, status: true, createdAt: true, deletedAt: true },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ count: allAssets.length, assets: allAssets });
    }
    // 返回特定项目的 assets
    const projectAssets = await prisma.asset.findMany({
      where: { projectId: project_id },
      select: { id: true, name: true, status: true, type: true, sizeBytes: true, folderId: true, deletedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ projectId: project_id, count: projectAssets.length, assets: projectAssets });
  } catch (err) {
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ── Serve React SPA (production) ────────────────────────
if (existsSync(CLIENT_DIST)) {
  // 静态资源（JS/CSS/图片等）
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', index: false }));

  // SPA fallback: 所有非 /api 和非 /uploads 的 GET 请求都返回 index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(join(CLIENT_DIST, 'index.html'));
  });

  console.log('📦 Serving React SPA from', CLIENT_DIST);
}

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FrameReview API running on http://0.0.0.0:${PORT}`);
});
