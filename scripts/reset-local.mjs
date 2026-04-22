import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const uploadRoot = path.resolve(projectRoot, process.env.UPLOAD_DIR || './uploads');

function encodeConnectionPart(value = '') {
  return encodeURIComponent(value);
}

function applyRuntimeEnvFallbacks() {
  if (!process.env.DATABASE_URL && process.env.DB_HOST && process.env.DB_DATABASE && process.env.DB_USERNAME) {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT || '5432';
    const database = process.env.DB_DATABASE;
    const username = encodeConnectionPart(process.env.DB_USERNAME);
    const password = encodeConnectionPart(process.env.DB_PASSWORD || '');

    process.env.DATABASE_URL = `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }
}

function resetUploads() {
  fs.rmSync(uploadRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(uploadRoot, 'temp'), { recursive: true });
  fs.mkdirSync(path.join(uploadRoot, 'assets'), { recursive: true });
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

applyRuntimeEnvFallbacks();

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL. Please configure DATABASE_URL or DB_* variables before running reset:local.');
  process.exit(1);
}

resetUploads();
run('npx', ['prisma@5.22.0', 'db', 'push', '--force-reset', '--skip-generate']);
run('npx', ['prisma@5.22.0', 'generate']);
run('node', ['prisma/seed.js']);

console.log(`Local reset complete. Upload directory rebuilt at ${uploadRoot}`);
