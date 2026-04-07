import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// ── Helpers ──────────────────────────────────────────────

async function getProjectWithAccess(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { workspace: true },
  });
  if (!project) return null;

  // 检查用户是否有工作区权限
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member) return null;

  return project;
}

async function requireProjectAccess(projectId, userId) {
  const project = await getProjectWithAccess(projectId, userId);
  if (!project) return null;
  return project;
}

async function requireProjectEditAccess(projectId, userId) {
  const project = await requireProjectAccess(projectId, userId);
  if (!project) return null;
  // owner/admin/editor 可以编辑
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  if (!member || !['owner', 'admin', 'editor'].includes(member.role)) return null;
  return project;
}

// ── Validation ────────────────────────────────────────────

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 嵌套路由：/api/workspaces/:workspaceId/projects
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// GET /api/workspaces/:workspaceId/projects
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const { page = 1, per_page = 20, status, search } = req.query;

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member) return res.status(403).json({ message: 'Unauthorized' });

    const where = {
      workspaceId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          _count: { select: { assets: true, folders: true, members: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ data: projects, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// POST /api/workspaces/:workspaceId/projects
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { workspaceId } = req.params;
    const data = createSchema.parse(req.body);

    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: req.userId } },
    });
    if (!member || !['owner', 'admin', 'editor'].includes(member.role)) {
      return res.status(403).json({ message: 'Forbidden' });
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

    // 添加创建者为项目成员
    await prisma.projectMember.create({
      data: { projectId: project.id, userId: req.userId, role: 'owner' },
    });

    res.status(201).json(project);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 直连路由：/api/projects/:projectId
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 创建直连路由器（不嵌套在 workspace 下）
const directRouter = Router();

// GET /api/projects/:id
directRouter.get('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const detail = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        folders: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar: true } } },
        },
        _count: { select: { assets: true } },
      },
    });

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// PUT /api/projects/:id
directRouter.put('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

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

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// DELETE /api/projects/:id
directRouter.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    await prisma.project.update({
      where: { id: project.id },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Project deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/archive
directRouter.post('/:id/archive', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: 'archived' },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/unarchive
directRouter.post('/:id/unarchive', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const updated = await prisma.project.update({
      where: { id: project.id },
      data: { status: 'active' },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/activity
directRouter.get('/:id/activity', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const { page = 1, per_page = 20 } = req.query;

    const activities = await prisma.activityLog.findMany({
      where: {
        subjectType: 'Project',
        subjectId: project.id,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(per_page),
      take: Number(per_page),
    });

    res.json({ data: activities });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id/stats
directRouter.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const [assetCount, folderCount, totalSize, byType] = await Promise.all([
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
    ]);

    res.json({
      assetCount,
      folderCount,
      totalSizeBytes: totalSize._sum.sizeBytes || BigInt(0),
      assetsByType: byType.map(b => ({ type: b.type, count: b._count.type })),
      memberCount: project.workspace
        ? await prisma.workspaceMember.count({ where: { workspaceId: project.workspaceId } })
        : 0,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/duplicate
directRouter.post('/:id/duplicate', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectEditAccess(req.params.id, req.userId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

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

    // 复制文件夹结构（不复制资产）
    // TODO: 如需深复制文件夹和资产，可扩展

    res.status(201).json(duplicated);
  } catch (err) {
    next(err);
  }
});

// 导出嵌套路由和直连路由
export { router as nestedRouter, directRouter };

// 默认导出嵌套路由（向后兼容）
export default router;
