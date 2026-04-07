import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// ── GET /api/workspaces/:workspaceId/projects ──────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { page = 1, per_page = 20 } = req.query;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId, deletedAt: null },
        include: {
          folders: { take: 1 },
          _count: { select: { assets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.project.count({ where: { workspaceId, deletedAt: null } }),
    ]);

    res.json({ data: projects, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/workspaces/:workspaceId/projects ────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { name, description } = req.body;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const project = await prisma.project.create({
      data: { workspaceId, name, description },
    });

    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/workspaces/:workspaceId/projects/:id ─────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { workspaceId, id } = req.params;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const project = await prisma.project.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        folders: true,
        members: { include: { user: { select: { id: true, name: true, avatar: true } } } },
      },
    });

    if (!project) return res.status(404).json({ message: 'Project not found' });

    res.json(project);
  } catch (err) {
    next(err);
  }
});

// ── PATCH /api/workspaces/:workspaceId/projects/:id ───────
router.patch('/:id', authenticate, async (req, res, next) => {
  try {
    const { workspaceId, id } = req.params;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const project = await prisma.project.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const updated = await prisma.project.update({
      where: { id },
      data: req.body,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/workspaces/:workspaceId/projects/:id ──────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const { workspaceId, id } = req.params;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    await prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
