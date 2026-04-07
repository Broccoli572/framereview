import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// ── GET /api/search ──────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { q, type, workspace_id, project_id, page = 1, per_page = 20 } = req.query;
    if (!q) return res.status(400).json({ message: 'Query required' });

    const workspaceFilter = workspace_id ? { workspaceId: workspace_id } : {};
    const projectFilter = project_id ? { projectId: project_id } : {};

    let results = { assets: [], folders: [], projects: [], threads: [] };

    if (!type || type === 'asset') {
      results.assets = await prisma.asset.findMany({
        where: {
          ...projectFilter,
          name: { contains: q, mode: 'insensitive' },
          deletedAt: null,
        },
        take: Number(per_page),
        select: { id: true, name: true, type: true, status: true, createdAt: true },
      });
    }

    if (!type || type === 'folder') {
      results.folders = await prisma.folder.findMany({
        where: {
          ...projectFilter,
          name: { contains: q, mode: 'insensitive' },
          deletedAt: null,
        },
        take: Number(per_page),
        select: { id: true, name: true, createdAt: true },
      });
    }

    if (!type || type === 'project') {
      results.projects = await prisma.project.findMany({
        where: {
          ...workspaceFilter,
          name: { contains: q, mode: 'insensitive' },
          deletedAt: null,
        },
        take: Number(per_page),
        select: { id: true, name: true, status: true, createdAt: true },
      });
    }

    if (!type || type === 'thread') {
      results.threads = await prisma.reviewThread.findMany({
        where: {
          comments: {
            some: {
              content: { contains: q, mode: 'insensitive' },
              isDeleted: false,
            },
          },
          deletedAt: null,
        },
        take: Number(per_page),
        select: { id: true, timecodeSeconds: true, status: true, createdAt: true },
      });
    }

    res.json(results);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/search/suggestions ─────────────────────────
router.get('/suggestions', authenticate, async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ suggestions: [] });

    const [assets, projects] = await Promise.all([
      prisma.asset.findMany({
        where: {
          name: { startsWith: q, mode: 'insensitive' },
          deletedAt: null,
        },
        take: 5,
        select: { id: true, name: true, type: true },
      }),
      prisma.project.findMany({
        where: {
          name: { startsWith: q, mode: 'insensitive' },
          deletedAt: null,
        },
        take: 5,
        select: { id: true, name: true },
      }),
    ]);

    const suggestions = [
      ...assets.map(a => ({ type: 'asset', id: a.id, name: a.name, subtype: a.type })),
      ...projects.map(p => ({ type: 'project', id: p.id, name: p.name })),
    ];

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/search/recent ───────────────────────────────
router.get('/recent', authenticate, async (req, res, next) => {
  try {
    // 从 ActivityLog 读取最近搜索
    const recentSearches = await prisma.activityLog.findMany({
      where: {
        userId: req.userId,
        action: 'search',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { properties: true, createdAt: true },
    });

    res.json({
      recent: recentSearches.map(s => ({
        query: s.properties?.query || '',
        timestamp: s.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/search/recent ────────────────────────────
router.delete('/recent', authenticate, async (req, res, next) => {
  try {
    await prisma.activityLog.deleteMany({
      where: {
        userId: req.userId,
        action: 'search',
      },
    });

    res.json({ message: 'Recent searches cleared' });
  } catch (err) {
    next(err);
  }
});

export default router;
