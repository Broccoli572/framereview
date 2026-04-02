/**
 * 波形图任务 — 从音频/视频提取波形数据
 * 输出：waveform.json（归一化振幅数组）
 */

import { execSync } from 'child_process';
import { join } from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { logger } from '../utils/logger.js';
import { MEDIA_ROOT } from '../utils/db.js';

export async function processWaveform({ assetVersionId, filePath }) {
  const fullPath = join(MEDIA_ROOT, filePath);
  const outDir = join(MEDIA_ROOT, 'previews', assetVersionId);
  const jsonFile = join(outDir, 'waveform.json');

  logger.info(`[waveform] 生成波形: ${fullPath}`);

  // 提取 PCM 数据并采样到 200 个数据点
  execSync(
    `ffmpeg -y -i "${fullPath}" -af "aformat=channel_layouts=mono,compand=gain=-6,asetnsamples=200" -f f32le -`,
    { timeout: 60_000 }
  ).toString();

  // 解析 PCM 数据并归一化
  const rawPcm = execSync(
    `ffmpeg -y -i "${fullPath}" -af "aformat=channel_layouts=mono,aresample=1000,asetnsamples=200" -f f32le - 2>/dev/null`,
    { timeout: 60_000 }
  );

  const samples = new Float32Array(rawPcm.buffer);
  const normalized = Array.from(samples).map((v) => parseFloat((Math.abs(v)).toFixed(4)));

  writeFileSync(jsonFile, JSON.stringify({ samples: normalized }));

  await updatePreviewWaveform(assetVersionId, `/storage/previews/${assetVersionId}/waveform.json`);

  logger.success(`[waveform] 波形生成完成`);
  return jsonFile;
}
