function success(res, message, data = null, statusCode = 200, meta = null) {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
}
function created(res, message, data = null) { return success(res, message, data, 201); }
function fail(res, message, statusCode = 400, errors = null) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}
module.exports = { success, created, fail };
