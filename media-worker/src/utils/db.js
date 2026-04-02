/**
 * Media Worker — 数据库写入工具
 * 通过 DIRECTORY 路径共享 SQLite（开发）或连接 PostgreSQL（生产）
 */

import pg from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 从 .env.local 读取（Worker 专用环境变量）
try {
  const envPath = join(__dirname, '../../../.env');
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l.includes('='))
    .forEach((l) => {
      const [k, v] = l.split('=');
      if (k && !process.env[k]) process.env[k] = v.trim();
    });
} catch { /* .env.local 可能不存在 */ }

export const MEDIA_ROOT = process.env.MEDIA_ROOT || '/nas/media';
export const DATABASE_URL = process.env.DATABASE_URL ||
  `postgres://framereview:changeme@localhost:5432/framereview`;

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export async function updateAssetStatus(assetId, status) {
  await pool.query('UPDATE assets SET status = $1 WHERE id = $2', [status, assetId]);
}

export async function updatePreviewMetadata(assetVersionId, metadata) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, metadata, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id) DO UPDATE SET metadata = EXCLUDED.metadata`,
    [assetVersionId, JSON.stringify(metadata)]
  );
}

export async function updatePreviewPoster(assetVersionId, posterUrl) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, poster_url, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id) DO UPDATE SET poster_url = EXCLUDED.poster_url`,
    [assetVersionId, posterUrl]
  );
}

export async function updatePreviewSprite(assetVersionId, spriteUrl, keyframes) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, sprite_url, keyframes, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (asset_version_id) DO UPDATE SET sprite_url = EXCLUDED.sprite_url, keyframes = EXCLUDED.keyframes`,
    [assetVersionId, spriteUrl, JSON.stringify(keyframes)]
  );
}

export async function updatePreviewWaveform(assetVersionId, waveformUrl) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, waveform_url, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id) DO UPDATE SET waveform_url = EXCLUDED.waveform_url`,
    [assetVersionId, waveformUrl]
  );
}
