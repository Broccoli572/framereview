import { execFileSync } from 'child_process';
import { resolveMediaPath, updatePreviewMetadata } from '../utils/db.js';
import { logger } from '../utils/logger.js';

function parseFrameRate(value) {
  if (!value || typeof value !== 'string' || !value.includes('/')) return null;
  const [num, den] = value.split('/').map(Number);
  if (!num || !den) return null;
  return Number((num / den).toFixed(3));
}

export async function processVideoMetadata({ assetVersionId, filePath }) {
  const fullPath = resolveMediaPath(filePath);
  logger.info('Running ffprobe', { assetVersionId, filePath: fullPath });

  const json = execFileSync(
    'ffprobe',
    ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', fullPath],
    { timeout: 60000 }
  ).toString();

  const data = JSON.parse(json);
  const videoStream = data.streams?.find((stream) => stream.codec_type === 'video');
  const audioStream = data.streams?.find((stream) => stream.codec_type === 'audio');

  const metadata = {
    duration: Number.parseFloat(data.format?.duration || '0'),
    sizeBytes: Number.parseInt(data.format?.size || '0', 10),
    bitrate: Number.parseInt(data.format?.bit_rate || '0', 10),
    video: videoStream
      ? {
          codec: videoStream.codec_name || null,
          width: videoStream.width || null,
          height: videoStream.height || null,
          fps: parseFrameRate(videoStream.r_frame_rate),
          profile: videoStream.profile || null,
        }
      : null,
    audio: audioStream
      ? {
          codec: audioStream.codec_name || null,
          channels: audioStream.channels || null,
          sampleRate: Number.parseInt(audioStream.sample_rate || '0', 10) || null,
        }
      : null,
  };

  await updatePreviewMetadata(assetVersionId, metadata);
  logger.success('Metadata extracted', { assetVersionId, duration: metadata.duration });
  return metadata;
}
