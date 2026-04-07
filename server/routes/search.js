import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/search?q=keyword ────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, type, workspaceId } = req.query;
    if (!q) return res.status(400).json({ message: 'Query required' });

    const where = workspaceId ? { project: { workspaceId } } : {};

    const [assets, folders, projects] = await Promise.all([
      prisma.asset.findMany({
        where: { ...where, name: { contains: q, mode: 'insensitive' }, deletedAt: null },
        take: 20,
        select: { id: true, name: true, type: true, status: true, createdAt: true },
      }),
      prisma.folder.findMany({
        where: { ...where, name: { contains: q, mode: 'insensitive' }, deletedAt: null },
        take: 10,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.project.findMany({
        where: { workspaceId: workspaceId || undefined, name: { contains: q, mode: 'insensitive' }, deletedAt: null },
        take: 10,
        select: { id: true, name: true, status: true, createdAt: true },
      }),
    ]);

    res.json({ assets, folders, projects });
  } catch (err) {
    next(err);
  }
});

export default router;
