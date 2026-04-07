import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ── GET /api/admin/stats ────────────────────────────────
router.get('/stats', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const [userCount, projectCount, assetCount, storageBytes] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.asset.aggregate({ _sum: { sizeBytes: true } }),
    ]);

    res.json({
      users: userCount,
      projects: projectCount,
      assets: assetCount,
      storageBytes: storageBytes._sum.sizeBytes || 0,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/activity-logs ───────────────────────
router.get('/activity-logs', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const { page = 1, per_page = 50 } = req.query;

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.activityLog.count(),
    ]);

    res.json({ data: logs, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

export default router;
