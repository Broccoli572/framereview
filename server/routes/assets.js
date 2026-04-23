import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';
import { Router } from 'express';
import multer from 'multer';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import { enqueueAssetProcessing } from '../lib/mediaQueue.js';

const router = Router({ mergeParams: true });

// ── Storage Config ───────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const ASSETS_DIR = path.join(UPLOAD_DIR, 'assets');

function countCjk(text) {
  return (String(text || '').match(/[\u4e00-\u9fff]/g) || []).length;
}

function repairMojibakeText(text) {
  if (!text || typeof text !== 'string') return text || '';
  const suspicious = /[ÃÂÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßãäåæçèé�]/.test(text);
  if (!suspicious) return text;

  const decoded = Buffer.from(text, 'latin1').toString('utf8');
  return decoded && !decoded.includes('�') && countCjk(decoded) > countCjk(text)
    ? decoded
    : text;
}

function parseUploadMetadata(value) {
  if (!value) return undefined;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return undefined;

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : undefined;
  } catch {
    return undefined;
  }
}

// 确保目录存在
[TEMP_DIR, ASSETS_DIR].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

// Multer 配置（用于简单上传）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMP_DIR),
  filename: (req, file, cb) => {
    const originalName = repairMojibakeText(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(originalName)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 * 1024 }, // 10GB
});

// ── Helpers ──────────────────────────────────────────────

function getAssetType(mimeType) {
  if (mimeType?.startsWith('video/')) return 'video';
  if (mimeType?.startsWith('audio/')) return 'audio';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.includes('document') || mimeType?.includes('spreadsheet') || mimeType?.includes('presentation')) return 'document';
  return 'other';
}

function getFallbackAssetStatus() {
  return 'ready';
}

function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function queueAssetProcessing({ assetId, assetVersionId, filePath, mimeType, type }) {
  try {
    await enqueueAssetProcessing({ assetId, assetVersionId, filePath, mimeType, type });
    await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'processing' },
    });
    return {
      queued: true,
      fallback: false,
      status: 'processing',
    };
  } catch (error) {
    console.error('[Asset] Failed to enqueue processing job:', error);

    const fallbackStatus = getFallbackAssetStatus(type, mimeType);

    await prisma.asset.update({
      where: { id: assetId },
      data: { status: fallbackStatus },
    });

    return {
      queued: false,
      fallback: true,
      status: fallbackStatus,
    };
  }
}

function resolvePublicUploadPath(fileUrl) {
  if (!fileUrl) return null;
  const relativePath = fileUrl.replace(/^\/uploads[\\/]?/, '');
  return path.resolve(UPLOAD_DIR, relativePath);
}

function getPublicUploadUrl(filePath) {
  if (!filePath) return null;

  const resolvedUploadRoot = path.resolve(UPLOAD_DIR);
  const absoluteFilePath = path.resolve(filePath);
  const relativePath = path.relative(resolvedUploadRoot, absoluteFilePath);

  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null;
  }

  return `/uploads/${relativePath.split(path.sep).join('/')}`;
}

function withFileUrl(version) {
  if (!version) return version;
  return {
    ...version,
    fileUrl: getPublicUploadUrl(version.filePath),
  };
}

async function attachThumbnailUrls(assets) {
  const currentVersionIds = assets
    .map((asset) => asset.currentVersionId)
    .filter(Boolean);

  if (!currentVersionIds.length) {
    return assets.map((asset) => ({ ...asset, thumbnailUrl: null }));
  }

  const previews = await prisma.assetPreview.findMany({
    where: {
      assetVersionId: {
        in: currentVersionIds,
      },
    },
    select: {
      assetVersionId: true,
      posterUrl: true,
      metadata: true,
      proxyUrl: true,
      hlsUrl: true,
    },
  });

  const previewByVersionId = new Map(
    previews.map((preview) => [preview.assetVersionId, preview])
  );

  const versions = await prisma.assetVersion.findMany({
    where: {
      id: {
        in: currentVersionIds,
      },
    },
    select: {
      id: true,
      filePath: true,
    },
  });

  const versionById = new Map(
    versions.map((version) => [version.id, version])
  );

  return assets.map((asset) => ({
    ...asset,
    thumbnailUrl: asset.currentVersionId
      ? (previewByVersionId.get(asset.currentVersionId)?.posterUrl || null)
      : null,
    previewMetadata: asset.currentVersionId
      ? (previewByVersionId.get(asset.currentVersionId)?.metadata || null)
      : null,
    previewUrl: asset.currentVersionId
      ? (
          previewByVersionId.get(asset.currentVersionId)?.proxyUrl
          || previewByVersionId.get(asset.currentVersionId)?.hlsUrl
          || getPublicUploadUrl(versionById.get(asset.currentVersionId)?.filePath)
          || null
        )
      : null,
    fileUrl: asset.currentVersionId
      ? (getPublicUploadUrl(versionById.get(asset.currentVersionId)?.filePath) || null)
      : null,
  }));
}

async function requireAssetAccess(assetId, userId) {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId, deletedAt: null },
    include: { project: { include: { workspace: true } } },
  });
  if (!asset) return null;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: asset.project.workspaceId, userId } },
  });
  return member ? asset : null;
}

// ── Validation ────────────────────────────────────────────

const initiateSchema = z.object({
  project_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  file_name: z.string().min(1).max(500),
  file_size: z.number().positive(),
  content_type: z.string().min(1),
  parent_asset_id: z.string().uuid().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const finalizeSchema = z.object({
  folder_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
});

const updateAssetSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  folder_id: z.string().uuid().nullable().optional(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 分段上传流程
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// POST /api/assets/upload/initiate — 开始上传
router.post('/upload/initiate', authenticate, async (req, res, next) => {
  try {
    const data = initiateSchema.parse(req.body);
    const originalFileName = repairMojibakeText(data.file_name);

    // 验证项目访问权限
    const project = await prisma.project.findFirst({
      where: { id: data.project_id, deletedAt: null },
      include: { workspace: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Forbidden' });

    // 创建上传会话（用 Asset 记录）
    const asset = await prisma.asset.create({
      data: {
        projectId: data.project_id,
        folderId: data.folder_id || null,
        name: originalFileName,
        originalName: originalFileName,
        mimeType: data.content_type,
        sizeBytes: BigInt(data.file_size),
        type: getAssetType(data.content_type),
        status: 'uploading',
        metadata: data.metadata || undefined,
        createdBy: req.userId,
      },
    });

    // 本地存储路径
    const assetDir = path.join(ASSETS_DIR, asset.id);
    fs.mkdirSync(assetDir, { recursive: true });

    res.status(201).json({
      uploadId: asset.id,
      assetId: asset.id,
      // 返回上传 URL（本地部署直接返回相对路径）
      uploadUrl: `/api/assets/upload/${asset.id}/chunk`,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// PUT /api/assets/upload/:uploadId/chunk — 上传分块
router.put('/upload/:uploadId/chunk', authenticate, upload.single('chunk'), async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: req.params.uploadId } });
    if (!asset) return res.status(404).json({ message: 'Upload not found' });
    if (asset.status !== 'uploading') return res.status(400).json({ message: 'Upload not in progress' });

    // 将 chunk 追加到临时文件
    const chunkPath = path.join(TEMP_DIR, `${asset.id}.partial`);
    if (req.file) {
      fs.appendFileSync(chunkPath, fs.readFileSync(req.file.path));
      // 清理 multer 临时文件
      fs.unlinkSync(req.file.path);
    } else if (req.body && Buffer.isBuffer(req.body)) {
      fs.appendFileSync(chunkPath, req.body);
    }

    // 检查是否上传完成
    const stats = fs.statSync(chunkPath);
    const expectedSize = Number(asset.sizeBytes || 0n);
    const progress = expectedSize > 0 ? Math.round((stats.size / expectedSize) * 100) : 0;

    res.json({ progress: Math.min(progress, 100), received: stats.size });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/upload/:uploadId/finalize — 完成上传
router.post('/upload/:uploadId/finalize', authenticate, async (req, res, next) => {
  try {
    const data = finalizeSchema.parse(req.body);
    const { uploadId } = req.params;

    const asset = await prisma.asset.findUnique({ where: { id: uploadId } });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });
    if (asset.status !== 'uploading') return res.status(400).json({ message: 'Upload not in progress' });

    const chunkPath = path.join(TEMP_DIR, `${uploadId}.partial`);

    if (!fs.existsSync(chunkPath)) {
      return res.status(400).json({ message: 'No upload data found' });
    }

    // 计算文件 SHA256
    const sha256 = await hashFile(chunkPath);

    // 移动到最终位置
    const ext = path.extname(asset.originalName || asset.name) || '';
    const finalFileName = `v1${ext}`;
    const assetDir = path.join(ASSETS_DIR, uploadId);
    const finalPath = path.join(assetDir, finalFileName);

    fs.renameSync(chunkPath, finalPath);

    // 更新数据库
    await prisma.asset.update({
      where: { id: uploadId },
      data: {
        status: 'processing',
        storagePath: finalPath,
        sha256,
        name: data.name ? repairMojibakeText(data.name) : asset.name,
        ...(data.folder_id !== undefined && { folderId: data.folder_id }),
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    });

    // 创建 AssetVersion
    const version = await prisma.assetVersion.create({
      data: {
        assetId: uploadId,
        versionNumber: 1,
        filePath: finalPath,
        sizeBytes: BigInt(fs.statSync(finalPath).size),
        sha256,
        uploadedBy: req.userId,
      },
    });

    // 更新当前版本
    await prisma.asset.update({
      where: { id: uploadId },
      data: { currentVersionId: version.id },
    });

    const processingResult = await queueAssetProcessing({
      assetId: uploadId,
      assetVersionId: version.id,
      filePath: finalPath,
      mimeType: asset.mimeType,
      type: asset.type,
    });

    const processedAsset = await prisma.asset.findUnique({
      where: { id: uploadId },
      include: {
        creator: { select: { id: true, name: true, avatar: true } },
      },
    });

    res.json({
      asset: processedAsset,
      version,
      processingQueued: processingResult.queued,
      processingFallback: processingResult.fallback,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── 简单上传（Multer，小文件直接上传）───────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { project_id, folder_id, name, description, tags } = req.body;
    const metadata = parseUploadMetadata(req.body.metadata);

    // 验证项目访问权限
    const project = await prisma.project.findFirst({
      where: { id: project_id, deletedAt: null },
      include: { workspace: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Forbidden' });

    const assetId = crypto.randomUUID();
    const assetDir = path.join(ASSETS_DIR, assetId);
    fs.mkdirSync(assetDir, { recursive: true });

    const originalName = repairMojibakeText(req.file.originalname);
    const ext = path.extname(originalName);
    const finalPath = path.join(assetDir, `v1${ext}`);
    fs.renameSync(req.file.path, finalPath);

    const sha256 = await hashFile(finalPath);

    const asset = await prisma.asset.create({
      data: {
        id: assetId,
        projectId: project_id,
        folderId: folder_id || null,
        name: repairMojibakeText(name) || originalName,
        originalName,
        mimeType: req.file.mimetype,
        sizeBytes: BigInt(req.file.size),
        sha256,
        type: getAssetType(req.file.mimetype),
        status: 'processing',
        storagePath: finalPath,
        metadata,
        createdBy: req.userId,
      },
    });

    const version = await prisma.assetVersion.create({
      data: {
        assetId: asset.id,
        versionNumber: 1,
        filePath: finalPath,
        sizeBytes: BigInt(req.file.size),
        sha256,
        uploadedBy: req.userId,
      },
    });

    await prisma.asset.update({
      where: { id: asset.id },
      data: { currentVersionId: version.id },
    });

    const processingResult = await queueAssetProcessing({
      assetId: asset.id,
      assetVersionId: version.id,
      filePath: finalPath,
      mimeType: asset.mimeType,
      type: asset.type,
    });

    const processedAsset = await prisma.asset.findUnique({
      where: { id: asset.id },
    });

    res.status(201).json({
      asset: processedAsset,
      version,
      processingQueued: processingResult.queued,
      processingFallback: processingResult.fallback,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET assets list (mounted at /api/projects/:projectId/assets) ─
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { page = 1, per_page = 50, sort = 'created_at', order = 'desc', type, folder_id, search, status } = req.query;

    // 验证访问权限
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      include: { workspace: true },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Forbidden' });

    const sortMap = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      name: 'name',
      size_bytes: 'sizeBytes',
    };
    const orderBy = sortMap[sort] || 'createdAt';
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const where = {
      projectId,
      deletedAt: null,
      ...(type && type !== 'all' && type !== 'folder' && { type }),
      ...(status && { status }),
      // folder filtering: only when explicitly provided
      ...(folder_id !== undefined && folder_id !== ''
        ? { folderId: folder_id }
        : (folder_id === '' ? { folderId: null } : {})),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { originalName: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    // Clean undefined values
    Object.keys(where).forEach(key => where[key] === undefined && delete where[key]);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
        include: {
          creator: { select: { id: true, name: true, avatar: true } },
          folder: { select: { id: true, name: true } },
        },
      }),
      prisma.asset.count({ where }),
    ]);

    const assetsWithThumbnails = await attachThumbnailUrls(assets);

    res.json({ data: assetsWithThumbnails, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/assets/:id ─────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const detail = await prisma.asset.findUnique({
      where: { id: asset.id },
      include: {
        versions: {
          include: {
            preview: true,
            uploader: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { versionNumber: 'desc' },
        },
        creator: { select: { id: true, name: true, avatar: true } },
        folder: { select: { id: true, name: true } },
      },
    });

    const versions = (detail?.versions || []).map(withFileUrl);
    const currentVersion = versions.find((version) => version.id === detail?.currentVersionId) || null;

    res.json({
      ...detail,
      versions,
      fileUrl: currentVersion?.fileUrl || getPublicUploadUrl(detail?.storagePath),
    });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/assets/:id ─────────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const data = updateAssetSchema.parse(req.body);

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.tags !== undefined && { tags: data.tags }),
        ...(data.folder_id !== undefined && { folderId: data.folder_id }),
      },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── DELETE /api/assets/:id ──────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    await prisma.asset.update({
      where: { id: asset.id },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    res.json({ message: 'Asset deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/:id/move ───────────────────────────
router.post('/:id/move', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const { folder_id } = req.body;

    const updated = await prisma.asset.update({
      where: { id: asset.id },
      data: { folderId: folder_id || null },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/:id/process ────────────────────────
router.post('/:id/process', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const version = await prisma.assetVersion.findFirst({
      where: { assetId: asset.id },
      orderBy: { versionNumber: 'desc' },
    });

    if (!version?.filePath) {
      return res.status(400).json({ message: 'No asset version available for processing' });
    }

    const processingResult = await queueAssetProcessing({
      assetId: asset.id,
      assetVersionId: version.id,
      filePath: version.filePath,
      mimeType: asset.mimeType,
      type: asset.type,
    });

    if (!processingResult.queued) {
      return res.json({
        message: 'Background processing is unavailable. The original file remains playable.',
        processingQueued: false,
        processingFallback: processingResult.fallback,
      });
    }

    res.json({ message: 'Processing queued', processingQueued: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/assets/:id/versions ────────────────────────
router.get('/:id/versions', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const versions = await prisma.assetVersion.findMany({
      where: { assetId: asset.id },
      include: {
        preview: true,
        uploader: { select: { id: true, name: true, avatar: true } },
        _count: { select: { reviewThreads: true, shares: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });

    res.json({ data: versions.map(withFileUrl) });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/assets/:id/versions/:versionId ──────────
router.delete('/:id/versions/:versionId', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const version = await prisma.assetVersion.findFirst({
      where: { id: req.params.versionId, assetId: asset.id },
    });

    if (!version) return res.status(404).json({ message: 'Version not found' });

    // 不能删除最后一个版本
    const versionCount = await prisma.assetVersion.count({ where: { assetId: asset.id } });
    if (versionCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the only version' });
    }

    await prisma.assetVersion.delete({ where: { id: version.id } });

    res.json({ message: 'Version deleted' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/assets/:id/thumbnail ──────────────────────
router.get('/:id/thumbnail', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.id, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    // 查找当前版本的 poster
    const version = await prisma.assetVersion.findUnique({
      where: { id: asset.currentVersionId },
      include: { preview: true },
    });

    if (!version?.preview?.posterUrl) {
      return res.status(404).json({ message: 'Thumbnail not available' });
    }

    const thumbnailPath = resolvePublicUploadPath(version.preview.posterUrl);
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({ message: 'Thumbnail file not found' });
    }

    res.sendFile(thumbnailPath);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/batch-delete ───────────────────────
router.post('/batch-delete', authenticate, async (req, res, next) => {
  try {
    const { asset_ids } = req.body;
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      return res.status(400).json({ message: 'asset_ids is required' });
    }

    if (asset_ids.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 assets per batch' });
    }

    const result = await prisma.asset.updateMany({
      where: { id: { in: asset_ids }, deletedAt: null },
      data: { deletedAt: new Date(), status: 'deleted' },
    });

    res.json({ deleted: result.count });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/batch-move ─────────────────────────
router.post('/batch-move', authenticate, async (req, res, next) => {
  try {
    const { asset_ids, folder_id } = req.body;
    if (!Array.isArray(asset_ids) || asset_ids.length === 0) {
      return res.status(400).json({ message: 'asset_ids is required' });
    }

    if (asset_ids.length > 100) {
      return res.status(400).json({ message: 'Maximum 100 assets per batch' });
    }

    const result = await prisma.asset.updateMany({
      where: { id: { in: asset_ids }, deletedAt: null },
      data: { folderId: folder_id || null },
    });

    res.json({ moved: result.count });
  } catch (err) {
    next(err);
  }
});

export default router;
