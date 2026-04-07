import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/workspaces ───────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: { workspace: true },
    });

    const workspaces = memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      avatar: m.workspace.logo,
      role: m.role,
    }));

    res.json({ workspaces });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/workspaces ──────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { name, slug } = req.body;

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        members: {
          create: { userId: req.userId, role: 'owner' },
        },
      },
    });

    res.status(201).json(workspace);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/workspaces/:id ───────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.userId } },
    });

    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true, avatar: true } } } } },
    });

    res.json(workspace);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/workspaces/:id/invite ───────────────────────
router.post('/:id/invite', authenticate, async (req, res, next) => {
  try {
    const { email, role } = req.body;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.id, userId: req.userId } },
    });

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
      update: { role },
      create: { workspaceId: req.params.id, userId: user.id, role: role || 'member' },
    });

    res.json({ message: 'Invite sent' });
  } catch (err) {
    next(err);
  }
});

export default router;
