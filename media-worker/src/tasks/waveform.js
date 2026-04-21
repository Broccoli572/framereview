import fs from 'fs';
import { execFileSync } from 'child_process';
import { getPreviewDir, getPreviewPublicUrl, resolveMediaPath, updatePreviewWaveform } from '../utils/db.js';
import { logger } from '../utils/logger.js';

export async function processWaveform({ assetVersionId, filePath }) {
  const fullPath = resolveMediaPath(filePath);
  const outDir = getPreviewDir(assetVersionId);
  const jsonFile = `${outDir}/waveform.json`;
  fs.mkdirSync(outDir, { recursive: true });

  logger.info('Generating waveform', { assetVersionId, filePath: fullPath });

  const rawPcm = execFileSync(
    'ffmpeg',
    ['-y', '-i', fullPath, '-af', 'aformat=channel_layouts=mono,aresample=1000', '-f', 'f32le', '-'],
    { timeout: 60000, stdio: ['ignore', 'pipe', 'ignore'] }
  );

  const samples = new Float32Array(rawPcm.buffer, rawPcm.byteOffset, Math.floor(rawPcm.byteLength / 4));
  const step = Math.max(Math.floor(samples.length / 200), 1);
  const normalized = [];

  for (let index = 0; index < samples.length; index += step) {
    normalized.push(Number(Math.abs(samples[index]).toFixed(4)));
    if (normalized.length >= 200) break;
  }

  fs.writeFileSync(jsonFile, JSON.stringify({ samples: normalized }));

  const waveformUrl = getPreviewPublicUrl(assetVersionId, 'waveform.json');
  await updatePreviewWaveform(assetVersionId, waveformUrl);
  logger.success('Waveform generated', { assetVersionId, waveformUrl });
  return waveformUrl;
}
