const { validationResult } = require('express-validator');
const { fail } = require('../utils/apiResponse');
function validateRequest(req, res, next) { const result = validationResult(req); if (!result.isEmpty()) return fail(res, 'Validation failed', 422, result.array()); next(); }
module.exports = validateRequest;
