import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { z } from 'zod';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ── Validation ────────────────────────────────────────────

const createShareSchema = z.object({
  asset_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  name: z.string().max(255).optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  password: z.string().nullable().optional(),
  allow_download: z.boolean().optional(),
  allow_comment: z.boolean().optional(),
  resolution: z.string().nullable().optional(),
});

const updateShareSchema = z.object({
  name: z.string().max(255).optional(),
  expires_at: z.string().datetime({ offset: true }).nullable().optional(),
  password: z.string().nullable().optional(),
  allow_download: z.boolean().optional(),
  allow_comment: z.boolean().optional(),
  resolution: z.string().nullable().optional(),
});

// ── Helper ───────────────────────────────────────────────

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function getPermissions(data) {
  const perms = [];
  if (data.allow_download) perms.push('download');
  if (data.allow_comment) perms.push('comment');
  return perms.length > 0 ? perms.join(',') : 'view';
}

// ── GET /api/shares ───────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, per_page = 20 } = req.query;

    const [shares, total] = await Promise.all([
      prisma.share.findMany({
        where: { createdBy: req.userId, isActive: true },
        include: {
          assetVersion: {
            include: { asset: { select: { id: true, name: true, type: true } } },
          },
          _count: { select: { visits: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.share.count({ where: { createdBy: req.userId, isActive: true } }),
    ]);

    res.json({ data: shares, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/shares ──────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const data = createShareSchema.parse(req.body);

    if (!data.asset_id) {
      return res.status(400).json({ message: 'asset_id is required' });
    }

    // 查找资产当前版本
    const asset = await prisma.asset.findUnique({
      where: { id: data.asset_id, deletedAt: null },
    });
    if (!asset) return res.status(404).json({ message: 'Asset not found' });

    let versionId = asset.currentVersionId;
    if (!versionId) {
      const latest = await prisma.assetVersion.findFirst({
        where: { assetId: asset.id },
        orderBy: { versionNumber: 'desc' },
      });
      versionId = latest?.id;
    }
    if (!versionId) return res.status(400).json({ message: 'No version found for asset' });

    const passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;

    const share = await prisma.share.create({
      data: {
        assetVersionId: versionId,
        token: generateToken(),
        passwordHash,
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
        permissions: getPermissions(data),
        watermarkPolicy: data.resolution || null,
        createdBy: req.userId,
      },
      include: { assetVersion: { include: { asset: true } } },
    });

    res.status(201).json({ share });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── GET /api/shares/:token (公开) ─────────────────────────
router.get('/:token', optionalAuth, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({
      where: { token: req.params.token },
      include: {
        assetVersion: {
          include: {
            asset: true,
            preview: true,
          },
        },
      },
    });

    if (!share || !share.isActive) return res.status(404).json({ message: 'Share not found' });
    if (share.expiresAt && share.expiresAt < new Date()) return res.status(410).json({ message: 'Link expired' });

    // 记录访问（不重复记录同 session）
    await prisma.shareVisit.create({
      data: {
        shareId: share.id,
        userId: req.userId || null,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']?.substring(0, 500),
      },
    });

    res.json({
      share: {
        id: share.id,
        permissions: share.permissions,
        watermarkPolicy: share.watermarkPolicy,
        expiresAt: share.expiresAt,
        hasPassword: !!share.passwordHash,
      },
      assetVersion: share.assetVersion,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/shares/verify/:token (公开) ─────────────────
router.post('/verify/:token', async (req, res, next) => {
  try {
    const { password } = req.body;
    const share = await prisma.share.findUnique({ where: { token: req.params.token } });

    if (!share || !share.isActive) return res.status(404).json({ message: 'Share not found' });
    if (!share.passwordHash) return res.json({ valid: true }); // 无密码保护
    if (!password) return res.status(400).json({ message: 'Password required' });

    const valid = await bcrypt.compare(password, share.passwordHash);
    if (!valid) return res.status(401).json({ message: 'Invalid password' });

    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/shares/:id ───────────────────────────────────
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({ where: { id: req.params.id } });
    if (!share || share.createdBy !== req.userId) return res.status(404).json({ message: 'Share not found' });

    const data = updateShareSchema.parse(req.body);

    const updateData = {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.expires_at !== undefined && { expiresAt: data.expires_at ? new Date(data.expires_at) : null }),
      ...(data.allow_download !== undefined || data.allow_comment !== undefined) && {
        permissions: getPermissions(data),
      },
      ...(data.resolution !== undefined && { watermarkPolicy: data.resolution }),
    };

    // 更新密码需要重新 hash
    if (data.password !== undefined) {
      updateData.passwordHash = data.password ? await bcrypt.hash(data.password, 10) : null;
    }

    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updated = await prisma.share.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── DELETE /api/shares/:id ────────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({ where: { id: req.params.id } });
    if (!share || share.createdBy !== req.userId) return res.status(404).json({ message: 'Share not found' });

    await prisma.share.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Share deleted' });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/shares/:id/revoke ───────────────────────────
router.post('/:id/revoke', authenticate, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({ where: { id: req.params.id } });
    if (!share || share.createdBy !== req.userId) return res.status(404).json({ message: 'Share not found' });

    await prisma.share.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ message: 'Share revoked' });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/shares/:id/stats ─────────────────────────────
router.get('/:id/stats', authenticate, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({ where: { id: req.params.id } });
    if (!share || share.createdBy !== req.userId) return res.status(404).json({ message: 'Share not found' });

    const totalVisits = await prisma.shareVisit.count({ where: { shareId: share.id } });

    // 最近 7 天访问量
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentVisits = await prisma.shareVisit.count({
      where: { shareId: share.id, visitedAt: { gte: sevenDaysAgo } },
    });

    // 唯一访客数（基于 IP）
    const uniqueVisitors = await prisma.shareVisit.groupBy({
      by: ['ipAddress'],
      where: { shareId: share.id, ipAddress: { not: null } },
    });

    res.json({
      totalVisits,
      recentVisits,
      uniqueVisitors: uniqueVisitors.length,
      isActive: share.isActive,
      expiresAt: share.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/shares/:id/visits ────────────────────────────
router.get('/:id/visits', authenticate, async (req, res, next) => {
  try {
    const share = await prisma.share.findUnique({ where: { id: req.params.id } });
    if (!share || share.createdBy !== req.userId) return res.status(404).json({ message: 'Share not found' });

    const { page = 1, per_page = 20 } = req.query;

    const [visits, total] = await Promise.all([
      prisma.shareVisit.findMany({
        where: { shareId: share.id },
        include: { visitor: { select: { id: true, name: true, avatar: true } } },
        orderBy: { visitedAt: 'desc' },
        skip: (Number(page) - 1) * Number(per_page),
        take: Number(per_page),
      }),
      prisma.shareVisit.count({ where: { shareId: share.id } }),
    ]);

    res.json({ data: visits, total, page: Number(page), per_page: Number(per_page) });
  } catch (err) {
    next(err);
  }
});

export default router;
