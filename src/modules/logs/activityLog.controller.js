const ActivityLog = require('./activityLog.model');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.list = asyncHandler(async (req, res) => { const filter = {}; ['userId','module','action'].forEach((k)=>{ if(req.query[k]) filter[k]=req.query[k]; }); const result = await paginate(ActivityLog, filter, req.query, { populate: [{ path: 'userId', select: 'name mobile role' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
