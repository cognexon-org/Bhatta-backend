const { fail } = require('../utils/apiResponse');
const { t } = require('../constants/messages');
function permit(...roles) { return (req, res, next) => { if (!req.user || !roles.includes(req.user.role)) return fail(res, t('FORBIDDEN', req.lang), 403); next(); }; }
module.exports = { permit };
