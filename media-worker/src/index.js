/**
 * FrameReview V2 — Media Worker 入口
 *
 * 消费 Laravel 队列中的媒体处理任务：
 * - ffprobe 元数据提取
 * - 缩略图抽帧
 * - 雪碧图生成
 * - 波形图生成
 * - HLS 预览转码（可选）
 */

import 'dotenv/config';
import pkg from 'bullmq';
const { Worker, Queue, Redis } = pkg;
import { initFfprobe, processVideoMetadata } from './tasks/ffprobe.js';
import { processThumbnail } from './tasks/thumbnail.js';
import { processSprite } from './tasks/sprite.js';
import { processWaveform } from './tasks/waveform.js';
import { logger } from './utils/logger.js';

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

const MEDIA_ROOT = process.env.MEDIA_ROOT || '/nas/media';

// 建立 Redis 连接
const connection = new Redis(Redis_CONFIG, { maxRetriesPerRequest: null });

// 媒体处理队列
const mediaQueue = new Queue('media-processing', { connection });

// ── Worker ───────────────────────────────────────────────────
const worker = new Worker(
  'media-processing',
  async (job) => {
    logger.info(`[${job.id}] 开始处理任务: ${job.name}`, { data: job.data });

    switch (job.name) {
      case 'video.metadata':
        await processVideoMetadata(job.data);
        break;
      case 'video.thumbnail':
        await processThumbnail(job.data);
        break;
      case 'video.sprite':
        await processSprite(job.data);
        break;
      case 'audio.waveform':
        await processWaveform(job.data);
        break;
      default:
        logger.warn(`[${job.id}] 未知任务类型: ${job.name}`);
    }

    logger.info(`[${job.id}] 任务完成`);
  },
  {
    connection,
    concurrency: parseInt(process.env.MEDIA_WORKER_CONCURRENCY || '2'),
    limiter: {
      max: 5,
      duration: 1000, // 每秒最多 5 个任务
    },
  }
);

// 事件监听
worker.on('completed', (job) => {
  logger.success(`[${job.id}] ✅ 完成`);
});

worker.on('failed', (job, err) => {
  logger.error(`[${job?.id}] ❌ 失败: ${err.message}`);
  // 最多重试 3 次，指数退避
  if (job?.attemptsMade < 3) {
    logger.info(`[${job.id}] 将重试（第 ${job.attemptsMade + 1} 次）...`);
  }
});

worker.on('error', (err) => {
  logger.error(`Worker 错误: ${err.message}`);
});

logger.info('🚀 Media Worker 已启动，等待任务...');
