import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/assets/:assetId/versions/:versionId/threads ─
router.get('/assets/:assetId/versions/:versionId/threads', authenticate, async (req, res, next) => {
  try {
    const threads = await prisma.reviewThread.findMany({
      where: { assetVersionId: req.params.versionId },
      include: {
        comments: {
          where: { isDeleted: false },
          include: { user: { select: { id: true, name: true, avatar: true } } },
          orderBy: { createdAt: 'asc' },
        },
        resolver: { select: { id: true, name: true } },
      },
      orderBy: { timecodeSeconds: 'asc' },
    });
    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/:assetId/versions/:versionId/threads ─
router.post('/assets/:assetId/versions/:versionId/threads', authenticate, async (req, res, next) => {
  try {
    const { type, timecodeSeconds, frameNumber, areaCoordinates } = req.body;

    const thread = await prisma.reviewThread.create({
      data: {
        assetVersionId: req.params.versionId,
        type: type || 'timecode',
        timecodeSeconds,
        frameNumber,
        areaCoordinates,
      },
    });

    res.status(201).json(thread);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/assets/:assetId/versions/:versionId/threads/in-range ─
router.get('/assets/:assetId/versions/:versionId/threads/in-range', authenticate, async (req, res, next) => {
  try {
    const { start, end } = req.query;

    const threads = await prisma.reviewThread.findMany({
      where: {
        assetVersionId: req.params.versionId,
        timecodeSeconds: { gte: Number(start), lte: Number(end) },
      },
      include: { comments: true },
    });

    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/threads/:threadId ───────────────────────────
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
      },
    });
    if (!thread) return res.status(404).json({ message: 'Thread not found' });
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/threads/:threadId ─────────────────────────
router.patch('/threads/:threadId', authenticate, async (req, res, next) => {
  try {
    const thread = await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: req.body,
    });
    res.json(thread);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/threads/:threadId ────────────────────────
router.delete('/threads/:threadId', authenticate, async (req, res, next) => {
  try {
    await prisma.reviewThread.update({
      where: { id: req.params.threadId },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Thread deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/threads/:threadId/comments ──────────────────
router.post('/threads/:threadId/comments', authenticate, async (req, res, next) => {
  try {
    const { content, parentId, mentions } = req.body;

    const comment = await prisma.reviewComment.create({
      data: {
        threadId: req.params.threadId,
        userId: req.userId,
        content,
        parentId,
        mentions,
      },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    });

    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/comments/:commentId ─────────────────────
router.delete('/comments/:commentId', authenticate, async (req, res, next) => {
  try {
    await prisma.reviewComment.update({
      where: { id: req.params.commentId },
      data: { isDeleted: true },
    });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/comments/:commentId/resolve ──────────────
router.patch('/comments/:commentId/resolve', authenticate, async (req, res, next) => {
  try {
    const comment = await prisma.reviewComment.findUnique({ where: { id: req.params.commentId } });
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    await prisma.reviewThread.update({
      where: { id: comment.threadId },
      data: { status: 'resolved', resolvedBy: req.userId, resolvedAt: new Date() },
    });

    res.json({ message: 'Thread resolved' });
  } catch (err) {
    next(err);
  }
});

export default router;
