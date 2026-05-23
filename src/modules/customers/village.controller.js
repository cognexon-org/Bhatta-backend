const Village = require('./village.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.createVillage = asyncHandler(async (req, res) => created(res, t('CREATED', req.lang), await Village.create(req.body)));
exports.listVillages = asyncHandler(async (req, res) => { const filter = {}; if (req.user.role === roles.MANAGER) filter.assignedManagerId = req.user._id; if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { beatName: new RegExp(req.query.search, 'i') }]; const result = await paginate(Village, filter, req.query, { populate: [{ path: 'assignedManagerId', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.updateVillage = asyncHandler(async (req, res) => { const item = await Village.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
