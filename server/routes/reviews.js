import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────

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

async function getCurrentVersionId(assetId) {
  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset?.currentVersionId) {
    // 尝试获取最新版本
    const latestVersion = await prisma.assetVersion.findFirst({
      where: { assetId },
      orderBy: { versionNumber: 'desc' },
    });
    return latestVersion?.id;
  }
  return asset.currentVersionId;
}

// ── Validation ────────────────────────────────────────────

const createThreadSchema = z.object({
  body: z.string().min(1).max(10000),
  timecode: z.number().nullable().optional(),
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
  metadata: z.record(z.unknown()).optional().default({}),
});

const updateThreadSchema = z.object({
  body: z.string().min(1).max(10000).optional(),
  resolved: z.boolean().optional(),
});

const addCommentSchema = z.object({
  body: z.string().min(1).max(10000),
  attachments: z.array(z.unknown()).optional().default([]),
  mentions: z.array(z.string()).optional().default([]),
});

const updateCommentSchema = z.object({
  body: z.string().min(1).max(10000),
});

const approvalSchema = z.object({
  status: z.enum(['approved', 'rejected', 'pending', 'needs_review']),
  note: z.string().max(5000).optional(),
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Thread 端点（前端路径: /assets/:assetId/threads）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/assets/:assetId/threads
router.get('/assets/:assetId/threads', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.assetId, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const versionId = await getCurrentVersionId(req.params.assetId);
    if (!versionId) return res.json({ threads: [] });

    const { page = 1, per_page = 50, resolved } = req.query;

    const where = { assetVersionId: versionId };
    if (resolved === 'true') where.status = 'resolved';
    else if (resolved === 'false') where.status = 'open';

    const [threads, total] = await Promise.all([
      prisma.reviewThread.findMany({
        where,
        include: {
          comments: {
            where: { isDeleted: false },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
          },
          resolver: { select: { id: true, name: true } },
          _count: { select: { comments: { where: { isDeleted: false } } } },
        },
        orderBy: { timecodeSeconds: 'asc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.reviewThread.count({ where }),
    ]);

    res.json({ data: threads, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:assetId/threads
router.post('/assets/:assetId/threads', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.assetId, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const versionId = await getCurrentVersionId(req.params.assetId);
    if (!versionId) return res.status(400).json({ message: 'No version found for asset' });

    const data = createThreadSchema.parse(req.body);

    const thread = await prisma.reviewThread.create({
      data: {
        assetVersionId: versionId,
        type: data.timecode !== null ? 'timecode' : 'general',
        timecodeSeconds: data.timecode ?? null,
        areaCoordinates: (data.x !== null && data.y !== null)
          ? { x: data.x, y: data.y, ...data.metadata }
          : null,
      },
      include: {
        resolver: { select: { id: true, name: true } },
      },
    });

    // 自动添加第一条评论
    const comment = await prisma.reviewComment.create({
      data: {
        threadId: thread.id,
        userId: req.userId,
        content: data.body,
        mentions: data.mentions,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json({ thread, comments: [comment] });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// GET /api/assets/:assetId/review-status
router.get('/assets/:assetId/review-status', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.assetId, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const versionId = await getCurrentVersionId(req.params.assetId);
    if (!versionId) return res.json({ status: 'no_version', openThreads: 0, resolvedThreads: 0 });

    const [openThreads, resolvedThreads] = await Promise.all([
      prisma.reviewThread.count({ where: { assetVersionId: versionId, status: 'open' } }),
      prisma.reviewThread.count({ where: { assetVersionId: versionId, status: 'resolved' } }),
    ]);

    const overallStatus = resolvedThreads > 0 && openThreads === 0 ? 'approved'
      : openThreads > 0 ? 'needs_review'
      : 'pending';

    res.json({ status: overallStatus, openThreads, resolvedThreads });
  } catch (err) {
    next(err);
  }
});

// POST /api/assets/:assetId/approval
router.post('/assets/:assetId/approval', authenticate, async (req, res, next) => {
  try {
    const asset = await requireAssetAccess(req.params.assetId, req.userId);
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    const data = approvalSchema.parse(req.body);

    // 更新资产状态
    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        metadata: {
          ...(asset.metadata || {}),
          approvalStatus: data.status,
          approvalNote: data.note,
          approvedBy: req.userId,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    // 如果批准，关闭所有 open threads
    if (data.status === 'approved') {
      const versionId = await getCurrentVersionId(asset.id);
      if (versionId) {
        await prisma.reviewThread.updateMany({
          where: { assetVersionId: versionId, status: 'open' },
          data: { status: 'resolved', resolvedBy: req.userId, resolvedAt: new Date() },
        });
      }
    }

    res.json({ message: `Asset ${data.status}`, status: data.status });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Thread 管理端点
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/threads/:threadId
router.get('/threads/:threadId', authenticate, async (req, res, next) => {
  try {
    const thread = await prisma.reviewThread.findUnique({
      where: { id: req.params.threadId },
      include: {
        comments: {
          where: { isDeleted: false },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        resolver: { select: { id: true, name: true } },
      },
    });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

// PUT /api/threads/:threadId
router.put('/threads/:threadId', authenticate, async (req, res, next) => {
  try {
    const data = updateThreadSchema.parse(req.body);

    const thread = await prisma.reviewThread.findUnique({
      where: { id: req.params.threadId },
    });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const updated = await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: {
        ...(data.resolved !== undefined && data.resolved === true && {
          status: 'resolved',
          resolvedBy: req.userId,
          resolvedAt: new Date(),
        }),
        ...(data.resolved !== undefined && data.resolved === false && {
          status: 'open',
          resolvedBy: null,
          resolvedAt: null,
        }),
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

// DELETE /api/threads/:threadId
router.delete('/threads/:threadId', authenticate, async (req, res, next) => {
  try {
    const thread = await prisma.reviewThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: { deletedAt: new Date() },
    });

    // 软删除所有评论
    await prisma.reviewComment.updateMany({
      where: { threadId: req.params.threadId },
      data: { isDeleted: true },
    });

    res.json({ message: 'Thread deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/:threadId/resolve
router.post('/threads/:threadId/resolve', authenticate, async (req, res, next) => {
  try {
    const thread = await prisma.reviewThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const updated = await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: { status: 'resolved', resolvedBy: req.userId, resolvedAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/:threadId/unresolve
router.post('/threads/:threadId/unresolve', authenticate, async (req, res, next) => {
  try {
    const thread = await prisma.reviewThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const updated = await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: { status: 'open', resolvedBy: null, resolvedAt: null },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Comment 端点
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/threads/:threadId/comments
router.get('/threads/:threadId/comments', authenticate, async (req, res, next) => {
  try {
    const { page = 1, per_page = 50 } = req.query;

    const thread = await prisma.reviewThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const [comments, total] = await Promise.all([
      prisma.reviewComment.findMany({
        where: { threadId: req.params.threadId, isDeleted: false },
        include: { user: { select: { id: true, name: true, avatar: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.reviewComment.count({ where: { threadId: req.params.threadId, isDeleted: false } }),
    ]);

    res.json({ data: comments, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// POST /api/threads/:threadId/comments
router.post('/threads/:threadId/comments', authenticate, async (req, res, next) => {
  try {
    const data = addCommentSchema.parse(req.body);

    const thread = await prisma.reviewThread.findUnique({ where: { id: req.params.threadId } });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });

    const comment = await prisma.reviewComment.create({
      data: {
        threadId: req.params.threadId,
        userId: req.userId,
        content: data.body,
        mentions: data.mentions,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    // 如果 thread 是 resolved 状态，添加评论自动 unresolve
    if (thread.status === 'resolved') {
      await prisma.reviewThread.update({
        where: { id: req.params.threadId },
        data: { status: 'open', resolvedBy: null, resolvedAt: null },
      });
    }

    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// PUT /api/comments/:commentId
router.put('/comments/:commentId', authenticate, async (req, res, next) => {
  try {
    const data = updateCommentSchema.parse(req.body);

    const comment = await prisma.reviewComment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!comment || comment.isDeleted) return res.status(404).json({ message: 'Comment not found' });

    // 只能编辑自己的评论
    if (comment.userId !== req.userId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await prisma.reviewComment.update({
      where: { id: req.params.commentId },
      data: { content: data.body },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// DELETE /api/comments/:commentId
router.delete('/comments/:commentId', authenticate, async (req, res, next) => {
  try {
    const comment = await prisma.reviewComment.findUnique({
      where: { id: req.params.commentId },
    });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await prisma.reviewComment.update({
      where: { id: req.params.commentId },
      data: { isDeleted: true },
    });

    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
