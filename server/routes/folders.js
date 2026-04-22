import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// ── Validation ────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parent_id: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  parent_id: z.string().uuid().nullable().optional(),
});

const moveSchema = z.object({
  parent_id: z.string().uuid().nullable(),
});

// ── Helpers ──────────────────────────────────────────────

async function getFolderWithAccess(folderId, userId) {
  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { project: { include: { workspace: true } } },
  });
  if (!folder || folder.deletedAt) return null;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: folder.project.workspaceId, userId } },
  });
  return member ? folder : null;
}

async function requireProjectAccessViaProject(projectId, userId) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: { workspace: true },
  });
  if (!project) return null;

  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
  });
  return member ? project : null;
}

// ── GET folder tree (mounted at /api/projects/:projectId/folders) ──
router.get('/tree', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccessViaProject(req.params.projectId, req.userId);
    if (!project) return res.status(403).json({ message: 'Unauthorized' });

    async function getTree(parentId = null) {
      const folders = await prisma.folder.findMany({
        where: { projectId: project.id, parentId, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: {
          _count: { select: { assets: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } },
        },
      });
      return Promise.all(
        folders.map(async (f) => ({
          id: f.id,
          name: f.name,
          sortOrder: f.sortOrder,
          createdAt: f.createdAt,
          assetCount: f._count.assets,
          children: await getTree(f.id),
        }))
      );
    }

    const tree = await getTree(null);
    res.json(tree);
  } catch (err) {
    next(err);
  }
});

// ── POST create folder (mounted at /api/projects/:projectId/folders) ─
router.post('/', authenticate, async (req, res, next) => {
  try {
    const project = await requireProjectAccessViaProject(req.params.projectId, req.userId);
    if (!project) return res.status(403).json({ message: 'Unauthorized' });

    const data = createSchema.parse(req.body);

    // 获取同级文件夹最大 sortOrder
    const siblings = await prisma.folder.findMany({
      where: { projectId: project.id, parentId: data.parent_id || null, deletedAt: null },
      orderBy: { sortOrder: 'desc' },
      take: 1,
    });

    const nextSortOrder = (siblings[0]?.sortOrder || 0) + 1;

    const folder = await prisma.folder.create({
      data: {
        projectId: project.id,
        name: data.name,
        parentId: data.parent_id || null,
        createdBy: req.userId,
        sortOrder: nextSortOrder,
      },
    });

    res.status(201).json(folder);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── GET /api/folders/:id ─────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const detail = await prisma.folder.findUnique({
      where: { id: folder.id },
      include: {
        _count: { select: { assets: { where: { deletedAt: null } }, children: { where: { deletedAt: null } } } },
      },
    });

    res.json(detail);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/folders/:id ─────────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const data = updateSchema.parse(req.body);

    const updated = await prisma.folder.update({
      where: { id: folder.id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.parent_id !== undefined && { parentId: data.parent_id }),
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

// ── DELETE /api/folders/:id ──────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    // 递归软删除子文件夹
    async function softDeleteChildren(parentId) {
      const children = await prisma.folder.findMany({
        where: { parentId, deletedAt: null },
      });
      for (const child of children) {
        await prisma.folder.update({ where: { id: child.id }, data: { deletedAt: new Date() } });
        await softDeleteChildren(child.id);
      }
    }

    await prisma.folder.update({ where: { id: folder.id }, data: { deletedAt: new Date() } });
    await softDeleteChildren(folder.id);

    // 软删除文件夹内的资产
    await prisma.asset.updateMany({
      where: { folderId: folder.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    res.json({ message: 'Folder deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/folders/:id/move ───────────────────────────
router.post('/:id/move', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const data = moveSchema.parse(req.body);

    // 防止移动到自己或自己的子文件夹下
    if (data.parent_id) {
      async function isDescendant(folderId, targetId) {
        if (folderId === targetId) return true;
        const children = await prisma.folder.findMany({
          where: { parentId: folderId, deletedAt: null },
          select: { id: true },
        });
        for (const child of children) {
          if (await isDescendant(child.id, targetId)) return true;
        }
        return false;
      }

      if (await isDescendant(folder.id, data.parent_id)) {
        return res.status(400).json({ message: 'Cannot move folder into its own subtree' });
      }
    }

    const updated = await prisma.folder.update({
      where: { id: folder.id },
      data: { parentId: data.parent_id },
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── GET /api/folders/:id/contents ────────────────────────
router.get('/:id/contents', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const { page = 1, per_page = 50 } = req.query;

    const [children, assets] = await Promise.all([
      prisma.folder.findMany({
        where: { parentId: folder.id, deletedAt: null },
        orderBy: { sortOrder: 'asc' },
        include: { _count: { select: { assets: { where: { deletedAt: null } } } } },
      }),
      prisma.asset.findMany({
        where: { folderId: folder.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
    ]);

    res.json({ folders: children, assets });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/folders/:id/assets ──────────────────────────
router.get('/:id/assets', authenticate, async (req, res, next) => {
  try {
    const folder = await getFolderWithAccess(req.params.id, req.userId);
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    const { page = 1, per_page = 50, sort = 'created_at', order = 'desc', type } = req.query;

    // 安全排序映射
    const sortMap = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      name: 'name',
      size_bytes: 'sizeBytes',
    };
    const orderBy = sortMap[sort] || 'createdAt';
    const orderDir = order === 'asc' ? 'asc' : 'desc';

    const where = {
      folderId: folder.id,
      deletedAt: null,
      ...(type && { type }),
    };

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        orderBy: { [orderBy]: orderDir },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.asset.count({ where }),
    ]);

    res.json({ data: assets, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

export default router;
