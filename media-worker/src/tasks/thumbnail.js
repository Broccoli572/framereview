import fs from 'fs';
import { execFileSync } from 'child_process';
import { getPreviewDir, getPreviewPublicUrl, resolveMediaPath, updatePreviewPoster } from '../utils/db.js';
import { logger } from '../utils/logger.js';

export async function processThumbnail({ assetVersionId, filePath }) {
  const fullPath = resolveMediaPath(filePath);
  const outDir = getPreviewDir(assetVersionId);
  const outFile = `${outDir}/poster.jpg`;
  fs.mkdirSync(outDir, { recursive: true });

  logger.info('Generating thumbnail', { assetVersionId, filePath: fullPath });

  execFileSync(
    'ffmpeg',
    ['-y', '-i', fullPath, '-ss', '00:00:01', '-vframes', '1', '-vf', 'scale=640:-1', outFile],
    { timeout: 30000 }
  );

  const posterUrl = getPreviewPublicUrl(assetVersionId, 'poster.jpg');
  await updatePreviewPoster(assetVersionId, posterUrl);
  logger.success('Thumbnail generated', { assetVersionId, posterUrl });
  return posterUrl;
}
