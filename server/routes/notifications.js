import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/notifications ───────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ notifications });
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

// ── PATCH /api/notifications/:id/read ────────────────────
router.patch('/:id/read', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });
    res.json({ message: 'Marked as read' });
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/notifications/read-all ───────────────────
router.patch('/read-all', authenticate, async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ message: 'All marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
