import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/folders/:id/tree ─────────────────────────────
router.get('/:id/tree', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;

    async function getTree(folderId) {
      const folder = await prisma.folder.findUnique({ where: { id: folderId }, include: { children: true } });
      if (!folder) return null;
      return {
        ...folder,
        children: await Promise.all(folder.children.map(c => getTree(c.id))),
      };
    }

    const tree = await getTree(id);
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/folders/:id/assets ───────────────────────────
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, per_page = 50 } = req.query;

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where: { folderId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.asset.count({ where: { folderId: id, deletedAt: null } }),
    ]);

    res.json({ data: assets, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/projects/:projectId/folders ────────────────
router.post('/projects/:projectId/folders', authenticate, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, parentId } = req.body;

    const folder = await prisma.folder.create({
      data: { projectId, name, parentId, createdBy: req.userId },
    });

    res.status(201).json(folder);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/folders/:id ───────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.folder.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    res.json({ message: 'Folder deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
