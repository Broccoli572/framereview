/**
 * 雪碧图任务 — 生成时间轴悬停预览条
 * 输出：sprite strip（JPEG）
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { MEDIA_ROOT } from '../utils/db.js';

export async function processSprite({ assetVersionId, filePath, duration, spriteColumns = 10 }) {
  const fullPath = join(MEDIA_ROOT, filePath);
  const outDir = join(MEDIA_ROOT, 'previews', assetVersionId);
  const outFile = join(outDir, 'sprite.jpg');

  // 计算抽帧间隔：10 列 × 10 行 = 100 张小图
  const totalFrames = spriteColumns * spriteColumns;
  const intervalSec = duration / totalFrames;

  logger.info(`[sprite] 生成雪碧图，间隔: ${intervalSec}s`);

  execSync(
    `ffmpeg -y -i "${fullPath}" -vf "fps=1/${intervalSec},scale=160:-1,tile=${spriteColumns}x${spriteColumns}" -q:v 5 "${outFile}"`,
    { timeout: 120_000 }
  );

  // 生成 keyframes 索引（每帧对应时间点）
  const keyframes = Array.from({ length: totalFrames }, (_, i) => ({
    index: i,
    time: parseFloat((i * intervalSec).toFixed(2)),
  }));

  await updatePreviewSprite(assetVersionId, `/storage/previews/${assetVersionId}/sprite.jpg`, keyframes);

  logger.success(`[sprite] 雪碧图生成完成: ${outFile}`);
  return outFile;
}
