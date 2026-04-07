import { Router } from 'express';
import { prisma } from '../index.js';
import { nanoid } from 'nanoid';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = Router();

// ── GET /api/shares/:token ──────────────────────────────── (公开)
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

    // 记录访问
    await prisma.shareVisit.create({
      data: {
        shareId: share.id,
        userId: req.userId,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });

    res.json({
      share: {
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

// ── POST /api/shares/:token/verify ──────────────────────── (公开)
router.post('/:token/verify', async (req, res, next) => {
  try {
    const { password } = req.body;
    const share = await prisma.share.findUnique({ where: { token: req.params.token } });

    if (!share) return res.status(404).json({ message: 'Share not found' });
    if (share.passwordHash && !(await require('bcryptjs').compare(password, share.passwordHash))) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    res.json({ valid: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/shares ───────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const shares = await prisma.share.findMany({
      where: { createdBy: req.userId },
      include: { assetVersion: { include: { asset: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ shares });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/assets/:assetId/shares ─────────────────────
router.post('/assets/:assetId/shares', authenticate, async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const { password, expiresAt, permissions, watermarkPolicy } = req.body;

    const passwordHash = password ? await require('bcryptjs').hash(password, 10) : null;

    const share = await prisma.share.create({
      data: {
        assetVersionId: assetId,
        token: nanoid(32),
        passwordHash,
        expiresAt,
        permissions: permissions || 'view',
        watermarkPolicy,
        createdBy: req.userId,
      },
    });

    res.status(201).json({ share });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/shares/:id ───────────────────────────────
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.share.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ message: 'Share deleted' });
  } catch (err) {
    next(err);
  }
});

export default router;
