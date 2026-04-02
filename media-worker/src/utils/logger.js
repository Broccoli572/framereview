/**
 * Media Worker — 日志工具（kleur 彩色输出）
 */

const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';

function ts() {
  return new Date().toISOString().slice(11, 23);
}

export const logger = {
  info: (msg, meta = {}) =>
    console.log(`${BLUE}[${ts()}]${RESET} ${msg}`, Object.keys(meta).length ? meta : ''),
  success: (msg) => console.log(`${GREEN}[${ts()}] ✅${RESET} ${msg}`),
  warn: (msg) => console.warn(`${YELLOW}[${ts()}] ⚠️${RESET} ${msg}`),
  error: (msg) => console.error(`${RED}[${ts()}] ❌${RESET} ${msg}`),
};
