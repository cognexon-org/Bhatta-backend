const Kiln = require('./kiln.model');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');

exports.createKiln = asyncHandler(async (req, res) => created(res, t('CREATED', req.lang), await Kiln.create(req.body)));
exports.listKilns = asyncHandler(async (req, res) => { const filter = {}; if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true'; const result = await paginate(Kiln, filter, req.query); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.getKiln = asyncHandler(async (req, res) => { const item = await Kiln.findById(req.params.id); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.updateKiln = asyncHandler(async (req, res) => { const item = await Kiln.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
