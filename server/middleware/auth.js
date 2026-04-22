import jwt from 'jsonwebtoken';
import { prisma } from '../index.js';
import { forbidden, unauthorized } from '../lib/http.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res);
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch {
    return unauthorized(res, '登录已过期');
  }
}

export async function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
  } catch {
    // ignore invalid tokens for public routes
  }
  next();
}

export function requireRole(roleName) {
  return async (req, res, next) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.userId },
        include: { roles: true },
      });

      if (!user || !user.roles.some((role) => role.name === roleName)) {
        return forbidden(res);
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
