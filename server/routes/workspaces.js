import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────

async function requireWorkspaceMember(workspaceId, userId) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!member) return null;
  return member;
}

async function requireWorkspaceOwnerOrAdmin(workspaceId, userId) {
  const member = await requireWorkspaceMember(workspaceId, userId);
  if (!member || !['owner', 'admin'].includes(member.role)) return null;
  return member;
}

// ── Validation ────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  avatar: z.string().max(500).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'editor', 'member', 'viewer']).default('member'),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'editor', 'member', 'viewer']),
});

// ── GET /api/workspaces ───────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: { workspace: { include: { _count: { select: { members: true, projects: true } } } } },
    });

    const workspaces = memberships.map(m => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      avatar: m.workspace.logo,
      role: m.role,
      memberCount: m.workspace._count.members,
      projectCount: m.workspace._count.projects,
      createdAt: m.workspace.createdAt,
    }));

    res.json({ data: workspaces });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/workspaces ──────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    // 自动生成 slug
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // 确保 slug 唯一
    const baseSlug = slug;
    let finalSlug = baseSlug;
    let counter = 1;
    while (await prisma.workspace.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        slug: finalSlug,
        members: {
          create: { userId: req.userId, role: 'owner' },
        },
      },
    });

    res.status(201).json({ data: workspace });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── GET /api/workspaces/:id ───────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { projects: true } },
      },
    });

    if (!workspace) return res.status(404).json({ message: 'Workspace not found' });

    res.json({ data: workspace });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/workspaces/:id ───────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!member) return res.status(403).json({ message: 'Forbidden' });

    const data = updateSchema.parse(req.body);

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatar !== undefined && { logo: data.avatar }),
      },
    });

    res.json(workspace);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── DELETE /api/workspaces/:id ────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!member) return res.status(403).json({ message: 'Forbidden' });

    // Soft delete
    await prisma.workspace.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    next(err);
  }
});

// ── Members ──────────────────────────────────────────────

// GET /api/workspaces/:id/members
router.get('/:id/members', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// PUT /api/workspaces/:id/members/:userId — update member role
router.put('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return res.status(403).json({ message: 'Forbidden' });

    const data = updateMemberRoleSchema.parse(req.body);

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
    });

    if (!targetMember) return res.status(404).json({ message: 'Member not found' });

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
      data: { role: data.role },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// DELETE /api/workspaces/:id/members/:userId — remove member
router.delete('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return res.status(403).json({ message: 'Forbidden' });

    // 不能删除自己（用 leave 接口）
    if (req.params.userId === req.userId) {
      return res.status(400).json({ message: 'Cannot remove yourself. Use leave workspace instead.' });
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
    });

    if (!targetMember) return res.status(404).json({ message: 'Member not found' });

    // 不能删除 owner
    if (targetMember.role === 'owner') {
      return res.status(400).json({ message: 'Cannot remove workspace owner' });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
    });

    res.json({ message: 'Member removed' });
  } catch (err) {
    next(err);
  }
});

// ── Invites ──────────────────────────────────────────────

// POST /api/workspaces/:id/invites
router.post('/:id/invites', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return res.status(403).json({ message: 'Forbidden' });

    const data = inviteSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 检查是否已经是成员
    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
    });

    if (existing) {
      return res.status(409).json({ message: 'User is already a member' });
    }

    await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.id,
        userId: user.id,
        role: data.role,
      },
    });

    // TODO: 发送邀请邮件/通知

    res.status(201).json({ message: 'Invite sent' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// GET /api/workspaces/:id/invites
router.get('/:id/invites', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    // 返回所有成员列表（当前实现：邀请即添加为成员）
    // TODO: 如需独立 invite 表，可扩展
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ invites: members });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/workspaces/:id/invites/:inviteId
router.delete('/:id/invites/:inviteId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return res.status(403).json({ message: 'Forbidden' });

    // 撤回邀请 = 移除成员（当前实现）
    const target = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.inviteId },
      },
    });

    if (!target) return res.status(404).json({ message: 'Invite not found' });

    if (target.role === 'owner') {
      return res.status(400).json({ message: 'Cannot cancel owner invite' });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.inviteId },
      },
    });

    res.json({ message: 'Invite cancelled' });
  } catch (err) {
    next(err);
  }
});

export default router;
