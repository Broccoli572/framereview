/**
 * ffprobe 任务 — 提取视频元数据
 * 输出：时长、分辨率、编码、帧率、音频流等信息
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger.js';
import { MEDIA_ROOT, DB_CONFIG } from '../utils/db.js';

export async function processVideoMetadata({ assetVersionId, filePath }) {
  const fullPath = join(MEDIA_ROOT, filePath);
  logger.info(`[ffprobe] 提取元数据: ${fullPath}`);

  const json = execSync(
    `ffprobe -v quiet -print_format json -show_format -show_streams "${fullPath}"`,
    { timeout: 60_000 }
  ).toString();

  const data = JSON.parse(json);
  const videoStream = data.streams.find((s) => s.codec_type === 'video');
  const audioStream = data.streams.find((s) => s.codec_type === 'audio');

  const metadata = {
    duration: parseFloat(data.format.duration || 0),
    size_bytes: parseInt(data.format.size || 0),
    bitrate: parseInt(data.format.bit_rate || 0),
    video: videoStream
      ? {
          codec: videoStream.codec_name,
          width: videoStream.width,
          height: videoStream.height,
          fps: eval(videoStream.r_frame_rate) || null, // ffprobe fps 格式 "30000/1001"
          profile: videoStream.profile,
        }
      : null,
    audio: audioStream
      ? {
          codec: audioStream.codec_name,
          channels: audioStream.channels,
          sample_rate: parseInt(audioStream.sample_rate || 0),
        }
      : null,
  };

  // 写回数据库 asset_previews.metadata
  await updatePreviewMetadata(assetVersionId, metadata);

  logger.success(`[ffprobe] 元数据提取完成: ${metadata.duration}s / ${metadata.video?.width}x${metadata.video?.height}`);
  return metadata;
}
