export function serializeForJson(value) {
  if (value === undefined) return null;

  return JSON.parse(JSON.stringify(value, (_key, item) => (
    typeof item === 'bigint' ? Number(item) : item
  )));
}

export function sendJson(res, status, payload = {}) {
  return res.status(status).json(serializeForJson(payload));
}

export function ok(res, payload = {}) {
  return sendJson(res, 200, payload);
}

export function created(res, payload = {}) {
  return sendJson(res, 201, payload);
}

export function message(res, text, extra = {}, status = 200) {
  return sendJson(res, status, { message: text, ...extra });
}

export function fail(res, status, text, extra = {}) {
  return sendJson(res, status, { message: text, ...extra });
}

export function badRequest(res, text = '请求无效', extra = {}) {
  return fail(res, 400, text, extra);
}

export function unauthorized(res, text = '未登录', extra = {}) {
  return fail(res, 401, text, extra);
}

export function forbidden(res, text = '无权限', extra = {}) {
  return fail(res, 403, text, extra);
}

export function notFound(res, text = '未找到', extra = {}) {
  return fail(res, 404, text, extra);
}

export function conflict(res, text = '数据冲突', extra = {}) {
  return fail(res, 409, text, extra);
}

export function validationFailed(res, errors, text = '校验失败') {
  return badRequest(res, text, { errors });
}

export function paginated(res, data, meta = {}) {
  return ok(res, { data, ...meta });
}
