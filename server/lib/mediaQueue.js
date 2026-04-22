import IORedis from 'ioredis';
import { Queue } from 'bullmq';

const QUEUE_NAME = 'media-processing';

function createRedisConnection() {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST;

  if (!redisUrl && !redisHost) {
    return null;
  }

  const baseOptions = {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    retryStrategy: () => null,
  };

  if (redisUrl) {
    return new IORedis(redisUrl, baseOptions);
  }

  return new IORedis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    ...baseOptions,
  });
}

async function closeRedisConnection(connection) {
  if (!connection) return;

  try {
    await connection.quit();
  } catch {
    connection.disconnect();
  }
}

export async function enqueueAssetProcessing({ assetId, assetVersionId, filePath, mimeType, type }) {
  const connection = createRedisConnection();

  if (!connection) {
    throw new Error('Redis queue is not configured');
  }

  connection.on('error', (error) => {
    console.error('[Queue] Redis connection error:', error?.message || error);
  });

  const queue = new Queue(QUEUE_NAME, { connection });

  try {
    await connection.connect();

    return await queue.add(
      'asset.process',
      {
        assetId,
        assetVersionId,
        filePath,
        mimeType,
        type,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      }
    );
  } finally {
    await queue.close().catch(() => {});
    await closeRedisConnection(connection);
  }
}
