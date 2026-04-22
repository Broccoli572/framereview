import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';
import {
  created,
  forbidden,
  message,
  notFound,
  ok,
  paginated,
  unauthorized,
  validationFailed,
} from '../lib/http.js';

const router = Router({ mergeParams: true });

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function getProjectWithAccess(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { workspace: true },
  });
  if (!project) return null;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) return null;

  return project;
}

async function requireProjectAccess(projectId, userId) {
  return getProjectWithAccess(projectId, userId);
}

async function requireProjectEditAccess(projectId, userId) {
  const project = await requireProjectAccess(projectId, userId);
  if (!project) return null;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });

  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) return null;
  return project;
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  color: z.string().max(20).optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional(),
  color: z.string().max(20).optional(),
  status: z.enum(['active', 'archived']).optional(),
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const page = parsePositiveInt(req.query.page, 1);
    const perPage = parsePositiveInt(req.query.per_page, 20);
    const { status, search } = req.query;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return unauthorized(res, '无权限访问工作区项目');

    const where = {
      workspaceId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          _count: { select: { assets: true, folders: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.project.count({ where }),
    ]);

    return paginated(res, projects, { total, page, per_page: perPage });
  } catch (err) {
    next(err);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const data = createSchema.parse(req.body);

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return forbidden(res, '无权限新建项目');
    }

    const project = await prisma.project.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description,
        cover: data.color,
        ownerId: req.userId,
      },
    });

    await prisma.projectMember.create({
      data: { projectId: project.id, userId: req.userId, role: 'owner' },
    });

    return created(res, { data: project });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

const directRouter = Router();

directRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const detail = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        workspace: { select: { id: true, name: true } },
        folders: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { assets: true, folders: true, members: true } },
      },
    });

    return ok(res, { data: detail });
  } catch (err) {
    next(err);
  }
});

directRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const data = updateSchema.parse(req.body);

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { cover: data.color }),
        ...(data.status !== undefined && { status: data.status }),
      },
    });

    return ok(res, { data: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return validationFailed(res, err.errors);
    }
    next(err);
  }
});

directRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    await prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() },
    });

    return message(res, '项目已删除');
  } catch (err) {
    next(err);
  }
});

directRouter.post('/:id/archive', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: 'archived' },
    });

    return ok(res, { data: updated });
  } catch (err) {
    next(err);
  }
});

directRouter.post('/:id/unarchive', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: 'active' },
    });

    return ok(res, { data: updated });
  } catch (err) {
    next(err);
  }
});

directRouter.get('/:id/activity', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const page = parsePositiveInt(req.query.page, 1);
    const perPage = parsePositiveInt(req.query.per_page, 20);

    const activities = await prisma.activityLog.findMany({
      where: {
        subjectType: 'Project',
        subjectId: project.id,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    });

    return paginated(res, activities, { page, per_page: perPage });
  } catch (err) {
    next(err);
  }
});

directRouter.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const [assetCount, folderCount, totalSize, byType, memberCount] = await Promise.all([
      prisma.asset.count({
        where: { projectId: project.id, deletedAt: null },
      }),
      prisma.folder.count({
        where: { projectId: project.id, deletedAt: null },
      }),
      prisma.asset.aggregate({
        where: { projectId: project.id, deletedAt: null },
        _sum: { sizeBytes: true },
      }),
      prisma.asset.groupBy({
        by: ['type'],
        where: { projectId: project.id, deletedAt: null },
        _count: { type: true },
      }),
      prisma.workspaceMember.count({ where: { workspaceId: project.workspaceId } }),
    ]);

    return ok(res, {
      data: {
        assetCount,
        folderCount,
        totalSizeBytes: totalSize._sum.sizeBytes || BigInt(0),
        assetsByType: byType.map((item) => ({ type: item.type, count: item._count.type })),
        memberCount,
      },
    });
  } catch (err) {
    next(err);
  }
});

directRouter.post('/:id/duplicate', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return notFound(res, '项目不存在');

    const { name } = req.body;

    const duplicated = await prisma.project.create({
      data: {
        workspaceId: project.workspaceId,
        name: name || `${project.name} (Copy)`,
        description: project.description,
        cover: project.cover,
        ownerId: req.userId,
      },
    });

    await prisma.projectMember.create({
      data: { projectId: duplicated.id, userId: req.userId, role: 'owner' },
    });

    return created(res, { data: duplicated });
  } catch (err) {
    next(err);
  }
});

export { router as nestedRouter, directRouter };
export default router;
