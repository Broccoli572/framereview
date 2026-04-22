import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import {
  conflict,
  created,
  forbidden,
  message,
  notFound,
  ok,
  unauthorized,
  validationFailed,
} from '../lib/http.js';

const router = Router();

async function requireWorkspaceMember(workspaceId, userId) {
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  return member || null;
}

async function requireWorkspaceOwnerOrAdmin(workspaceId, userId) {
  const member = await requireWorkspaceMember(workspaceId, userId);
  if (!member || !['owner', 'admin'].includes(member.role)) return null;
  return member;
}

function normalizeWorkspaceMember(member) {
  return {
    id: member.user?.id || member.userId,
    membershipId: member.id,
    name: member.user?.name || '',
    email: member.user?.email || '',
    avatar: member.user?.avatar || null,
    isActive: member.user?.isActive ?? true,
    role: member.role,
    createdAt: member.createdAt,
  };
}

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

router.get('/', authenticate, async (req, res, next) => {
  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: req.userId },
      include: {
        workspace: {
          include: {
            _count: { select: { members: true, projects: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const workspaces = memberships.map((membership) => ({
      id: membership.workspace.id,
      name: membership.workspace.name,
      slug: membership.workspace.slug,
      description: membership.workspace.description,
      avatar: membership.workspace.logo,
      role: membership.role,
      memberCount: membership.workspace._count.members,
      projectCount: membership.workspace._count.projects,
      createdAt: membership.workspace.createdAt,
      updatedAt: membership.workspace.updatedAt,
    }));

    return ok(res, { data: workspaces });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createSchema.parse(req.body);

    const baseSlug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    let slug = baseSlug || 'workspace';
    let counter = 1;

    while (await prisma.workspace.findUnique({ where: { slug } })) {
      slug = `${baseSlug || 'workspace'}-${counter++}`;
    }

    const workspace = await prisma.workspace.create({
      data: {
        name: data.name,
        description: data.description,
        slug,
        members: {
          create: { userId: req.userId, role: 'owner' },
        },
      },
    });

    return created(res, { data: workspace });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return unauthorized(res, '无权限访问工作区');

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { projects: true, members: true } },
      },
    });

    if (!workspace) return notFound(res, '工作区不存在');

    return ok(res, { data: workspace });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!member) return forbidden(res);

    const data = updateSchema.parse(req.body);

    const workspace = await prisma.workspace.update({
      where: { id: req.params.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.avatar !== undefined && { logo: data.avatar }),
      },
    });

    return ok(res, { data: workspace });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!member) return forbidden(res);

    await prisma.workspace.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });

    return message(res, '工作区已删除');
  } catch (err) {
    next(err);
  }
});

router.get('/:id/members', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return unauthorized(res, '无权限访问成员列表');

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const normalized = members.map(normalizeWorkspaceMember);
    return ok(res, { data: normalized, members: normalized });
  } catch (err) {
    next(err);
  }
});

router.put('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return forbidden(res);

    const data = updateMemberRoleSchema.parse(req.body);

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
    });

    if (!targetMember) return notFound(res, '成员不存在');

    const updated = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
      data: { role: data.role },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
    });

    return ok(res, { data: normalizeWorkspaceMember(updated) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

router.delete('/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return forbidden(res);

    if (req.params.userId === req.userId) {
      return forbidden(res, '请使用退出工作区');
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
    });

    if (!targetMember) return notFound(res, '成员不存在');
    if (targetMember.role === 'owner') return forbidden(res, '不能移除所有者');

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.userId },
      },
    });

    return message(res, '成员已移除');
  } catch (err) {
    next(err);
  }
});

router.post('/:id/invites', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return forbidden(res);

    const data = inviteSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return notFound(res, '用户不存在');

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: req.params.id, userId: user.id } },
    });

    if (existing) {
      return conflict(res, '用户已在工作区中');
    }

    await prisma.workspaceMember.create({
      data: {
        workspaceId: req.params.id,
        userId: user.id,
        role: data.role,
      },
    });

    return message(res, '邀请已发送', {}, 201);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

router.get('/:id/invites', authenticate, async (req, res, next) => {
  try {
    const member = await requireWorkspaceMember(req.params.id, req.userId);
    if (!member) return unauthorized(res, '无权限访问邀请列表');

    const invites = await prisma.workspaceMember.findMany({
      where: { workspaceId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatar: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const normalized = invites.map(normalizeWorkspaceMember);
    return ok(res, { data: normalized, invites: normalized });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/invites/:inviteId', authenticate, async (req, res, next) => {
  try {
    const adminMember = await requireWorkspaceOwnerOrAdmin(req.params.id, req.userId);
    if (!adminMember) return forbidden(res);

    const target = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.inviteId },
      },
    });

    if (!target) return notFound(res, '邀请不存在');
    if (target.role === 'owner') return forbidden(res, '不能撤销所有者');

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: { workspaceId: req.params.id, userId: req.params.inviteId },
      },
    });

    return message(res, '邀请已撤销');
  } catch (err) {
    next(err);
  }
});

export default router;
