const Season = require('./season.model');
const Kiln = require('../kilns/kiln.model');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const roles = require('../../constants/roles');
const { t } = require('../../constants/messages');

function scope(req, filter = {}) { if (req.user.role === roles.MANAGER && req.user.assignedKilnId) filter.kilnId = req.user.assignedKilnId; return filter; }
exports.list = asyncHandler(async (req, res) => { const filter = scope(req, {}); ['kilnId','status','isDefault'].forEach((k)=>{ if(req.query[k] !== undefined) filter[k] = k === 'isDefault' ? req.query[k] === 'true' : req.query[k]; }); const result = await paginate(Season, filter, req.query, { populate: [{ path: 'kilnId' }, { path: 'createdBy', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.create = asyncHandler(async (req, res) => { 
  const payload = { ...req.body, createdBy: req.user._id }; 
  if (req.user.assignedKilnId) {
    payload.kilnId = req.user.assignedKilnId; 
  } else if (!payload.kilnId) {
    const kiln = await Kiln.findOne();
    if(kiln) payload.kilnId = kiln._id;
  }
  if (!payload.kilnId) return fail(res, 'No kiln found to associate with this season', 400);
  if (payload.isDefault || payload.status === 'ACTIVE') await Season.updateMany({ kilnId: payload.kilnId }, { $set: { isDefault: false, status: 'CLOSED' } }); 
  const item = await Season.create(payload); 
  return created(res, t('CREATED', req.lang), item); 
});
exports.get = asyncHandler(async (req, res) => { const item = await Season.findById(req.params.id).populate('kilnId createdBy', 'name mobile'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.update = asyncHandler(async (req, res) => { const item = await Season.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.activate = asyncHandler(async (req, res) => { const item = await Season.findById(req.params.id); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); await Season.updateMany({ kilnId: item.kilnId }, { $set: { isDefault: false, status: 'CLOSED' } }); item.status = 'ACTIVE'; item.isDefault = true; await item.save(); return success(res, t('UPDATED', req.lang), item); });
exports.close = asyncHandler(async (req, res) => { const item = await Season.findByIdAndUpdate(req.params.id, { status: 'CLOSED', isDefault: false }, { new: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
