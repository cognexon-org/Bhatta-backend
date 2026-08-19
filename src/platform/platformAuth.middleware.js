const { fail } = require('../utils/apiResponse');

function platformAuth(req, res, next) {
  const expected = process.env.PLATFORM_ADMIN_KEY;
  if (!expected) return fail(res, 'PLATFORM_ADMIN_KEY is not configured', 503);
  const supplied = req.headers['x-platform-key'];
  if (!supplied || supplied !== expected) return fail(res, 'Platform authorization failed', 401);
  next();
}

module.exports = platformAuth;
