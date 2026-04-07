import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── Helpers ──────────────────────────────────────────────

const ACCESS_EXPIRES = '2h';
const REFRESH_EXPIRES_DAYS = 30;

function generateTokens(user) {
  const payload = { userId: user.id };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_EXPIRES });
  const refreshToken = crypto.randomBytes(64).toString('hex');
  return { accessToken, refreshToken, expiresIn: ACCESS_EXPIRES };
}

async function createRefreshToken(userId, refreshToken, userAgent) {
  return prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES_DAYS * 24 * 60 * 60 * 1000),
      userAgent: userAgent || null,
    },
  });
}

async function cleanupExpiredTokens(userId) {
  await prisma.refreshToken.deleteMany({
    where: {
      userId,
      expiresAt: { lt: new Date() },
    },
  });
}

// ── Validation ────────────────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email().max(255),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^a-zA-Z0-9]/),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^a-zA-Z0-9]/),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  password: z.string().min(8).regex(/[a-z]/).regex(/[A-Z]/).regex(/[^a-zA-Z0-9]/),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar: z.string().max(500).nullable().optional(),
});

// ── POST /api/auth/register ───────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: passwordHash,
        emailVerifiedAt: new Date(),
      },
      include: { roles: true },
    });

    // 分配默认 member 角色
    const memberRole = await prisma.role.findUnique({ where: { name: 'member' } });
    if (memberRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: memberRole.id },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await createRefreshToken(user.id, refreshToken, req.headers['user-agent']);

    res.status(201).json({
      user: { ...user, password: undefined },
      token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_EXPIRES,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { roles: true },
    });

    if (!user || !(await bcrypt.compare(data.password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Account is disabled' });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await createRefreshToken(user.id, refreshToken, req.headers['user-agent']);

    res.json({
      user: { ...user, password: undefined },
      token: accessToken,
      refresh_token: refreshToken,
      expires_in: ACCESS_EXPIRES,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/refresh ────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ message: 'Refresh token is required' });
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refresh_token },
      include: { user: { include: { roles: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      // 清理过期 token
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const user = stored.user;
    if (!user || !user.isActive) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ message: 'User not found or disabled' });
    }

    // 删除旧 refresh token，生成新的（rotation 策略）
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await createRefreshToken(user.id, newRefreshToken, req.headers['user-agent']);

    // 清理该用户的过期 token
    await cleanupExpiredTokens(user.id);

    res.json({
      user: { ...user, password: undefined },
      token: accessToken,
      refresh_token: newRefreshToken,
      expires_in: ACCESS_EXPIRES,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/auth/logout ─────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  try {
    // 删除该用户所有 refresh token（强制全设备登出）
    await prisma.refreshToken.deleteMany({ where: { userId: req.userId } });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.json({ message: 'Logged out' });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        roles: true,
        workspaceMemberships: {
          include: { workspace: true },
        },
      },
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ user: { ...user, password: undefined } });
  } catch (err) {
    next(err);
  }
});

// ── PUT /api/auth/profile ────────────────────────────────
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
      },
      include: { roles: true },
    });

    res.json({ user: { ...user, password: undefined } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── PUT /api/auth/password ───────────────────────────────
router.put('/password', authenticate, async (req, res, next) => {
  try {
    const data = changePasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isCurrentPasswordValid = await bcrypt.compare(data.current_password, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: passwordHash },
    });

    // 密码修改后使所有 refresh token 失效
    await prisma.refreshToken.deleteMany({ where: { userId: req.userId } });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/forgot-password ───────────────────────
router.post('/forgot-password', async (req, res, next) => {
  try {
    const data = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    if (user) {
      // 生成重置 token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 小时

      // 将 token 哈希后存储（安全起见）
      const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

      // 使用 JSON 字段存储 reset token（复用现有 schema，避免 migration）
      // 如果 User 模型没有 resetToken 字段，直接存到 metadata 或单独表
      // 暂用 RefreshToken 模型临时方案，或创建 PasswordReset 表
      await prisma.passwordReset.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          tokenHash: resetTokenHash,
          expiresAt: resetExpiresAt,
        },
        update: {
          tokenHash: resetTokenHash,
          expiresAt: resetExpiresAt,
        },
      });

      // TODO: 发送重置邮件（集成邮件服务后实现）
      console.log(`[Auth] Password reset token for ${user.email}: ${resetToken}`);
    }

    // 无论邮箱是否存在，都返回相同响应（防止用户枚举）
    res.json({ message: 'If email exists, reset link sent' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

// ── POST /api/auth/reset-password ───────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const data = resetPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid reset token' });
    }

    const tokenHash = crypto.createHash('sha256').update(data.token).digest('hex');

    const reset = await prisma.passwordReset.findUnique({
      where: { userId: user.id },
    });

    if (!reset || reset.tokenHash !== tokenHash || reset.expiresAt < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
    });

    // 删除 reset token 和所有 refresh token
    await prisma.passwordReset.delete({ where: { userId: user.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation failed', errors: err.errors });
    }
    next(err);
  }
});

export default router;
