const User = require('../modules/users/user.model');
const { verifyToken } = require('../config/jwt');
const { fail } = require('../utils/apiResponse');
const { t } = require('../constants/messages');
async function protect(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return fail(res, t('UNAUTHORIZED', req.lang), 401);
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('+passwordHash');
    if (!user || !user.isActive) return fail(res, t('UNAUTHORIZED', req.lang), 401);
    req.user = user;
    next();
  } catch (error) { return fail(res, t('UNAUTHORIZED', req.lang), 401); }
}
module.exports = { protect };
