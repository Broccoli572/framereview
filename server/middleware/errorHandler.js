import { fail, validationFailed } from '../lib/http.js';

export function errorHandler(err, req, res, next) {
  console.error('[Error]', err.message);
  console.error(err.stack);

  if (err.name === 'PrismaClientKnownRequestError') {
    return fail(res, 400, '数据库错误', { detail: err.message });
  }

  if (err.name === 'ZodError') {
    return validationFailed(res, err.errors);
  }

  return fail(res, err.status || 500, err.message || '服务器错误');
}
