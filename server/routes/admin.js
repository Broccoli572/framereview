import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = Router();

// ── Validation ────────────────────────────────────────────

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().max(255).optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'disabled']).optional(),
});

const updateSettingsSchema = z.object({
  registration_enabled: z.boolean().optional(),
  default_storage_quota_mb: z.number().min(0).optional(),
  allowed_file_types: z.array(z.string()).optional(),
  max_file_size_mb: z.number().min(0).optional(),
  max_upload_per_project_mb: z.number().min(0).optional(),
});

// ── GET /api/admin/stats ────────────────────────────────
router.get('/stats', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const [userCount, projectCount, assetCount, workspaceCount, storageBytes, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.project.count({ where: { deletedAt: null } }),
      prisma.asset.count({ where: { deletedAt: null } }),
      prisma.workspace.count({ where: { deletedAt: null } }),
      prisma.asset.aggregate({ _sum: { sizeBytes: true }, where: { deletedAt: null } }),
      prisma.user.count({
        where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    const assetsByType = await prisma.asset.groupBy({
      by: ['type'],
      where: { deletedAt: null },
      _count: { type: true },
    });

    res.json({
      users: userCount,
      recentUsers,
      projects: projectCount,
      assets: assetCount,
      workspaces: workspaceCount,
      storageBytes: Number(storageBytes._sum.sizeBytes || 0),
      assetsByType: assetsByType.map(a => ({ type: a.type, count: a._count.type })),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/activity-logs ────────────────────────
router.get('/activity-logs', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const { page = 1, per_page = 50, user_id, action, resource_type, date_from, date_to } = req.query;

    const where = {};
    if (user_id) where.userId = user_id;
    if (action) where.action = action;
    if (resource_type) where.subjectType = resource_type;
    if (date_from || date_to) {
      where.createdAt = {};
      if (date_from) where.createdAt.gte = new Date(date_from);
      if (date_to) where.createdAt.lte = new Date(date_to);
    }

    const [logs, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({ data: logs, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users ────────────────────────────────
router.get('/users', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const { page = 1, per_page = 50, search, role, status } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.roles = { some: { role: { name: role } } };
    }
    if (status === 'active') where.isActive = true;
    if (status === 'disabled') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          roles: { include: { role: true } },
          _count: {
            select: {
              workspaceMemberships: true,
              createdAssets: { where: { deletedAt: null } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true,
          roles: { include: { role: true } },
          _count: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/users/:userId ────────────────────────
router.get('/users/:userId', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.userId },
      include: {
        roles: { include: { role: true } },
        workspaceMemberships: {
          include: { workspace: true },
        },
        _count: {
          select: {
            createdAssets: { where: { deletedAt: null } },
            comments: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
        roles: { include: { role: true } },
        workspaceMemberships: { include: { workspace: { select: { id: true, name: true } } } },
        _count: true,
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/users/:userId ────────────────────────
router.put('/users/:userId', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const updateData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.status !== undefined && { isActive: data.status === 'active' }),
    };

    await prisma.user.update({
      where: { id: req.params.userId },
      data: updateData,
    });

    // 更新角色
    if (data.role) {
      const role = await prisma.role.findUnique({ where: { name: data.role } });
      if (role) {
        await prisma.userRole.deleteMany({ where: { userId: req.params.userId } });
        await prisma.userRole.create({
          data: { userId: req.params.userId, roleId: role.id },
        });
      }
    }

    res.json({ message: 'User updated' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── DELETE /api/admin/users/:userId ─────────────────────
router.delete('/users/:userId', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    // 不能删除自己
    if (req.params.userId === req.userId) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // 软删除
    await prisma.user.update({
      where: { id: req.params.userId },
      data: { isActive: false, deletedAt: new Date() },
    });

    res.json({ message: 'User disabled' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/workspaces ───────────────────────────
router.get('/workspaces', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const { page = 1, per_page = 50, search } = req.query;

    const where = { deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }

    const [workspaces, total] = await Promise.all([
      prisma.workspace.findMany({
        where,
        include: {
          _count: { select: { members: true, projects: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.workspace.count({ where }),
    ]);

    res.json({ data: workspaces, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/projects ─────────────────────────────
router.get('/projects', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const { page = 1, per_page = 50, search, status } = req.query;

    const where = { deletedAt: null };
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (status) where.status = status;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          workspace: { select: { id: true, name: true } },
          _count: { select: { assets: { where: { deletedAt: null } }, members: true } },
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

// ── GET /api/admin/health ───────────────────────────────
router.get('/health', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const [dbStatus, userCount] = await Promise.all([
      prisma.$queryRaw`SELECT 1 as ok`.then(() => 'connected').catch(() => 'disconnected'),
      prisma.user.count(),
    ]);

    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      database: dbStatus,
      uptime: Math.round(uptime),
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/admin/settings ─────────────────────────────
router.get('/settings', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    // 系统设置存储在第一个 system_admin 用户的 metadata 中
    const adminUser = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: 'system_admin' } } } },
      select: { metadata: true },
    });

    const settings = adminUser?.metadata?.systemSettings || {
      registration_enabled: true,
      default_storage_quota_mb: 10240,
      allowed_file_types: ['video/*', 'audio/*', 'image/*', 'application/pdf'],
      max_file_size_mb: 10240,
      max_upload_per_project_mb: 102400,
    };

    res.json(settings);
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/admin/settings ─────────────────────────────
router.put('/settings', authenticate, requireRole('system_admin'), async (req, res, next) => {
  try {
    const data = updateSettingsSchema.parse(req.body);

    const adminUser = await prisma.user.findFirst({
      where: { roles: { some: { role: { name: 'system_admin' } } } },
    });

    if (!adminUser) return res.status(500).json({ message: 'No admin user found' });

    const currentMetadata = adminUser.metadata || {};
    await prisma.user.update({
      where: { id: adminUser.id },
      data: {
        metadata: {
          ...currentMetadata,
          systemSettings: { ...currentMetadata.systemSettings, ...data },
        },
      },
    });

    res.json({ message: 'Settings updated', settings: data });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

export default router;
