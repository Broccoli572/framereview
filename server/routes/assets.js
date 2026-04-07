import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── POST /api/assets/upload/initiate ─────────────────────
router.post('/upload/initiate', authenticate, async (req, res, next) => {
  try {
    const { projectId, folderId, name, mimeType, sizeBytes } = req.body;

    const asset = await prisma.asset.create({
      data: {
        projectId,
        folderId,
        name,
        mimeType,
        sizeBytes,
        status: 'uploading',
        createdBy: req.userId,
      },
    });

    res.status(201).json({ assetId: asset.id });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/upload/finalize/:assetId ─────────────
router.post('/upload/finalize/:assetId', authenticate, async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { storagePath, sha256 } = req.body;

    const asset = await prisma.asset.update({
      where: { id: assetId },
      data: { status: 'processing', storagePath, sha256 },
    });

    // TODO: 触发 media-worker 队列任务

    res.json({ asset });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/upload ────────────────────────────────
router.post('/upload', authenticate, async (req, res, next) => {
  try {
    // 直接上传（用于小文件）
    const { projectId, folderId, name, mimeType, sizeBytes, buffer, sha256 } = req.body;

    const asset = await prisma.asset.create({
      data: {
        projectId,
        folderId,
        name,
        mimeType,
        sizeBytes: BigInt(sizeBytes),
        sha256,
        status: 'processing',
        createdBy: req.userId,
      },
    });

    res.status(201).json({ asset });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/assets/:id ───────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { versions: { include: { preview: true }, orderBy: { versionNumber: 'desc' } } },
    });

    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    res.json(asset);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/:id/process ─────────────────────────
router.post('/:id/process', authenticate, async (req, res, next) => {
  try {
    await prisma.asset.update({
      where: { id: req.params.id },
      data: { status: 'processing' },
    });

    // TODO: 入队 media-worker 任务

    res.json({ message: 'Processing queued' });
  } catch (err) {
    next(err);
  }
});

export default router;
