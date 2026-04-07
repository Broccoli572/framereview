import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';

/**
 * 验证 JWT 并注入 req.userId
 */
export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * 可选认证：找不到 token 也继续（用于公开接口）
 */
export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
  } catch (err) {
    // ignore
  }
  next();
}

/**
 * 要求特定角色
 */
export function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { roles: true },
      });

      if (!user || !user.roles.some(r => r.name === roleName)) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
