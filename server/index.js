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
import { serializeForJson } from './lib/http.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function encodeConnectionPart(value = '') {
  return encodeURIComponent(value);
}

function applyRuntimeEnvFallbacks() {
  if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_DATABASE && process.env.DB_USERNAME) {
    const protocol = process.env.DB_CONNECTION === 'postgres' ? 'postgresql' : 'postgresql';
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_DATABASE;
    const username = encodeConnectionPart(process.env.DB_USERNAME);
    const password = encodeConnectionPart(process.env.DB_PASSWORD || '');

    process.env.DATABASE_URL = `${protocol}://${username}:${password}@${host}:${port}/${database}`;
  }

  if (!process.env.REDIS_URL && process.env.REDIS_HOST) {
    const host = process.env.REDIS_HOST;
    const port = process.env.REDIS_PORT || '6379';
    const password = process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD !== 'null'
      ? `:${encodeConnectionPart(process.env.REDIS_PASSWORD)}@`
      : '';

    process.env.REDIS_URL = `redis://${password}${host}:${port}`;
  }

  if (!process.env.JWT_SECRET) {
    const fallbackSecret = process.env.APP_KEY?.replace(/^base64:/, '') || null;

    if (fallbackSecret) {
      process.env.JWT_SECRET = fallbackSecret;
    } else if (process.env.NODE_ENV !== 'production') {
      process.env.JWT_SECRET = 'local-dev-jwt-secret';
    }
  }
}

applyRuntimeEnvFallbacks();

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const CLIENT_DIST = join(__dirname, '../client/dist');

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function jsonWithSafeSerialization(data) {
    return originalJson(serializeForJson(data));
  };
  next();
});

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
      return;
    }

    callback(null, true);
  },
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', limiter);

export const prisma = new PrismaClient();

app.use('/uploads', express.static(UPLOAD_DIR));

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/workspaces/:workspaceId/projects', projectRoutes);
app.use('/api/projects/:projectId/assets', assetRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/projects/:projectId/folders', folderRoutes);
app.use('/api/projects', projectDirectRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

if (existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST, { maxAge: '1y', index: false }));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }

    return res.sendFile(join(CLIENT_DIST, 'index.html'));
  });

  console.log('Serving React SPA from', CLIENT_DIST);
}

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`FrameReview API running on http://0.0.0.0:${PORT}`);
});
