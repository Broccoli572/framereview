import 'dotenv/config';
import IORedis from 'ioredis';
import { Worker } from 'bullmq';
import { processVideoMetadata } from './tasks/ffprobe.js';
import { processThumbnail } from './tasks/thumbnail.js';
import { processSprite } from './tasks/sprite.js';
import { processWaveform } from './tasks/waveform.js';
import { updateAssetStatus } from './utils/db.js';
import { logger } from './utils/logger.js';

function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  const redisOptions = {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => Math.min(times * 1000, 5000),
  };

  if (redisUrl) {
    return new IORedis(redisUrl, redisOptions);
  }

  return new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...redisOptions,
  });
}

async function processAsset(job) {
  const { assetId, assetVersionId, filePath, type, mimeType } = job.data;

  logger.info('Processing asset job', {
    jobId: job.id,
    assetId,
    assetVersionId,
    type,
    mimeType,
  });

  try {
    let metadata = null;

    if (type === 'video') {
      metadata = await processVideoMetadata({ assetVersionId, filePath });
      await processThumbnail({ assetVersionId, filePath });
      await processSprite({
        assetVersionId,
        filePath,
        duration: metadata?.duration || 0,
      });
      await processWaveform({ assetVersionId, filePath });
    } else if (type === 'audio' || mimeType?.startsWith('audio/')) {
      await processWaveform({ assetVersionId, filePath });
    } else if (type === 'image') {
      await processThumbnail({ assetVersionId, filePath });
    }

    await updateAssetStatus(assetId, 'ready');
    logger.success('Asset processing complete', { assetId, assetVersionId });
  } catch (error) {
    await updateAssetStatus(assetId, 'failed');
    logger.error('Asset processing failed', {
      assetId,
      assetVersionId,
      error: error.message,
    });
    throw error;
  }
}

const connection = createRedisConnection();

connection.on('error', (error) => {
  logger.error('Redis connection error', {
    error: error?.message || String(error) || 'Unknown Redis error',
  });
});

const worker = new Worker(
  'media-processing',
  async (job) => {
    if (job.name !== 'asset.process') {
      logger.warn('Skipping unknown job', { jobName: job.name, jobId: job.id });
      return;
    }

    await processAsset(job);
  },
  {
    connection,
    concurrency: parseInt(process.env.MEDIA_WORKER_CONCURRENCY || '2', 10),
  }
);

worker.on('completed', (job) => {
  logger.success('Job completed', { jobId: job.id, jobName: job.name });
});

worker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job?.id,
    jobName: job?.name,
    error: error.message,
  });
});

worker.on('error', (error) => {
  const message = error?.message || String(error) || 'Unknown worker error';
  logger.error('Worker error', { error: message });
});

logger.info('Media worker started');
