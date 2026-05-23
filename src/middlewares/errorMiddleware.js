const { fail } = require('../utils/apiResponse');
function notFound(req, res) { return fail(res, `Route not found: ${req.originalUrl}`, 404); }
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  if (err.name === 'ValidationError') return fail(res, 'Validation failed', 422, Object.values(err.errors).map((e) => e.message));
  if (err.code === 11000) return fail(res, 'Duplicate value found', 409, err.keyValue);
  if (err.name === 'CastError') return fail(res, 'Invalid ID format', 400);
  return fail(res, err.message || 'Internal server error', err.statusCode || 500);
}
module.exports = { notFound, errorHandler };
