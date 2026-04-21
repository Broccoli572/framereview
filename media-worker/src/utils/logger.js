const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[36m';

function ts() {
  return new Date().toISOString().slice(11, 19);
}

function formatMeta(meta) {
  return meta && Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
}

export const logger = {
  info(message, meta = {}) {
    console.log(`${BLUE}[${ts()}]${RESET} ${message}${formatMeta(meta)}`);
  },
  success(message, meta = {}) {
    console.log(`${GREEN}[${ts()}]${RESET} ${message}${formatMeta(meta)}`);
  },
  warn(message, meta = {}) {
    console.warn(`${YELLOW}[${ts()}]${RESET} ${message}${formatMeta(meta)}`);
  },
  error(message, meta = {}) {
    console.error(`${RED}[${ts()}]${RESET} ${message}${formatMeta(meta)}`);
  },
};
