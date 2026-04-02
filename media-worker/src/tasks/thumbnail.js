/**
 * 缩略图任务 — 从视频提取封面帧
 * 输出：poster.jpg（640px 宽，JPEG）
 */

import { execSync } from 'child_process';
import { dirname, join, extname } from 'path';
import { logger } from '../utils/logger.js';
import { MEDIA_ROOT } from '../utils/db.js';

export async function processThumbnail({ assetVersionId, filePath }) {
  const fullPath = join(MEDIA_ROOT, filePath);
  const outDir = join(MEDIA_ROOT, 'previews', assetVersionId);
  const outFile = join(outDir, 'poster.jpg');

  logger.info(`[thumbnail] 生成缩略图: ${fullPath}`);

  // 抽帧：取视频 10% 位置的一帧
  execSync(
    `ffmpeg -y -ss 10% -i "${fullPath}" -vframes 1 -vf "scale=640:-1" "${outFile}"`,
    { timeout: 30_000 }
  );

  // 写回数据库 asset_previews.poster_url
  const posterUrl = `/storage/previews/${assetVersionId}/poster.jpg`;
  await updatePreviewPoster(assetVersionId, posterUrl);

  logger.success(`[thumbnail] 缩略图生成完成: ${outFile}`);
  return outFile;
}
