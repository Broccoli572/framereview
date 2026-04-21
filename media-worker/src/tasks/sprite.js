import fs from 'fs';
import { execFileSync } from 'child_process';
import { getPreviewDir, getPreviewPublicUrl, resolveMediaPath, updatePreviewSprite } from '../utils/db.js';
import { logger } from '../utils/logger.js';

export async function processSprite({ assetVersionId, filePath, duration = 0, spriteColumns = 10 }) {
  const fullPath = resolveMediaPath(filePath);
  const outDir = getPreviewDir(assetVersionId);
  const outFile = `${outDir}/sprite.jpg`;
  fs.mkdirSync(outDir, { recursive: true });

  const totalFrames = spriteColumns * spriteColumns;
  const safeDuration = duration > 0 ? duration : totalFrames;
  const intervalSec = Math.max(safeDuration / totalFrames, 1);

  logger.info('Generating sprite', { assetVersionId, intervalSec });

  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      fullPath,
      '-vf',
      `fps=1/${intervalSec},scale=160:-1,tile=${spriteColumns}x${spriteColumns}`,
      '-q:v',
      '5',
      outFile,
    ],
    { timeout: 120000 }
  );

  const keyframes = Array.from({ length: totalFrames }, (_, index) => ({
    index,
    time: Number((index * intervalSec).toFixed(2)),
  }));

  const spriteUrl = getPreviewPublicUrl(assetVersionId, 'sprite.jpg');
  await updatePreviewSprite(assetVersionId, spriteUrl, keyframes);
  logger.success('Sprite generated', { assetVersionId, spriteUrl });
  return spriteUrl;
}
