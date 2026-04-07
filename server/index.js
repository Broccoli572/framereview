import 'dotenv/config';
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

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// ── Middleware ──────────────────────────────────────────
app.use(helmet());
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
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/projects', projectRoutes);
app.use('/api/projects', projectDirectRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/projects/:projectId/assets', assetRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/projects/:projectId/shares', shareRoutes);
app.use('/api/assets/:assetId/shares', shareRoutes);
app.use('/api', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 根路由
app.get('/', (req, res) => {
  res.json({
    name: 'FrameReview API',
    version: '2.0.0',
    status: 'running',
  });
});

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 FrameReview API running on http://0.0.0.0:${PORT}`);
});
