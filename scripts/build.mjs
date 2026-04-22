import 'dotenv/config';
import { spawnSync } from 'child_process';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function shouldSyncDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

run('npm', ['--prefix', 'client', 'install']);
run('npm', ['--prefix', 'client', 'run', 'build']);
run('npx', ['prisma@5.22.0', 'generate']);

if (shouldSyncDatabase()) {
  console.log('DATABASE_URL detected. Running Prisma db push and seed...');
  run('npx', ['prisma@5.22.0', 'db', 'push']);
  run('node', ['prisma/seed.js']);
} else {
  console.log('DATABASE_URL not set. Skipping Prisma db push and seed.');
}
