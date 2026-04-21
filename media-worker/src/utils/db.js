import fs from 'fs';
import path from 'path';
import pg from 'pg';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;

    const index = trimmed.indexOf('=');
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(path.join(PROJECT_ROOT, '.env'));
loadDotEnvFile(path.join(PROJECT_ROOT, '.env.local'));

function resolveRootPath(targetPath, fallback) {
  const effective = targetPath || fallback;
  if (path.isAbsolute(effective)) return effective;
  return path.resolve(PROJECT_ROOT, effective);
}

export const MEDIA_ROOT = resolveRootPath(process.env.UPLOAD_DIR, './uploads');
export const PREVIEWS_ROOT = path.join(MEDIA_ROOT, 'previews');
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://framereview:changeme@localhost:5432/framereview';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export function resolveMediaPath(filePath) {
  if (path.isAbsolute(filePath)) return filePath;
  return path.join(MEDIA_ROOT, filePath);
}

export function getPreviewDir(assetVersionId) {
  return path.join(PREVIEWS_ROOT, assetVersionId);
}

export function getPreviewPublicUrl(assetVersionId, filename) {
  return `/uploads/previews/${assetVersionId}/${filename}`;
}

export async function updateAssetStatus(assetId, status) {
  await pool.query('UPDATE assets SET status = $1, updated_at = NOW() WHERE id = $2', [status, assetId]);
}

export async function updatePreviewMetadata(assetVersionId, metadata) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, metadata, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id)
     DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = NOW()`,
    [assetVersionId, JSON.stringify(metadata)]
  );
}

export async function updatePreviewPoster(assetVersionId, posterUrl) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, poster_url, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id)
     DO UPDATE SET poster_url = EXCLUDED.poster_url, updated_at = NOW()`,
    [assetVersionId, posterUrl]
  );
}

export async function updatePreviewSprite(assetVersionId, spriteUrl, keyframes) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, sprite_url, keyframes, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (asset_version_id)
     DO UPDATE SET sprite_url = EXCLUDED.sprite_url, keyframes = EXCLUDED.keyframes, updated_at = NOW()`,
    [assetVersionId, spriteUrl, JSON.stringify(keyframes)]
  );
}

export async function updatePreviewWaveform(assetVersionId, waveformUrl) {
  await pool.query(
    `INSERT INTO asset_previews (asset_version_id, waveform_url, created_at, updated_at)
     VALUES ($1, $2, NOW(), NOW())
     ON CONFLICT (asset_version_id)
     DO UPDATE SET waveform_url = EXCLUDED.waveform_url, updated_at = NOW()`,
    [assetVersionId, waveformUrl]
  );
}
