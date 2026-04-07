import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/notifications ───────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, per_page = 20, type, read } = req.query;

    const where = { userId: req.userId };
    if (type) where.type = type;
    if (read === 'true') where.readAt = { not: null };
    else if (read === 'false') where.readAt = null;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.notification.count({ where }),
    ]);

    res.json({ data: notifications, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/notifications/unread-count ─────────────────
router.get('/unread-count', authenticate, async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, readAt: null },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/notifications/:id/read ─────────────────────
router.post('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id, userId: req.userId },
      data: { readAt: new Date() },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/notifications/read-all ─────────────────────
router.post('/read-all', authenticate, async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: 'All marked as read', count: result.count });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/notifications/:id ────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.delete({
      where: { id: req.params.id, userId: req.userId },
    });
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/notifications/preferences ───────────────────
router.get('/preferences', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { metadata: true },
    });

    // 从用户 metadata 中读取通知偏好
    const preferences = user?.metadata?.notificationPreferences || {
      email: { mentions: true, replies: true, approvals: false },
      inApp: { mentions: true, replies: true, approvals: true, shares: true },
    };

    res.json({ preferences });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/notifications/preferences ───────────────────
router.put('/preferences', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const currentMetadata = user.metadata || {};
    const updatedMetadata = {
      ...currentMetadata,
      notificationPreferences: req.body,
    };

    await prisma.user.update({
      where: { id: req.userId },
      data: { metadata: updatedMetadata },
    });

    res.json({ message: 'Preferences updated', preferences: req.body });
  } catch (err) {
    next(err);
  }
});

export default router;
