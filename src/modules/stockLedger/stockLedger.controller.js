const StockLedger = require('./stockLedger.model');
const StockCategory = require('../stock/stockCategory.model');
const { correctStock } = require('../stock/stock.service');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');

function filter(req) {
  const f = {};
  ['kilnId','seasonId','transactionType','categoryCode','sourceModule','approvalStatus'].forEach((k)=>{ if(req.query[k]) f[k] = req.query[k]; });
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId = req.user.assignedKilnId;
  if (req.query.fromDate || req.query.toDate) { f.date = {}; if (req.query.fromDate) f.date.$gte = new Date(req.query.fromDate); if (req.query.toDate) { const d = new Date(req.query.toDate); d.setHours(23,59,59,999); f.date.$lte = d; } }
  return f;
}
exports.list = asyncHandler(async (req, res) => { const result = await paginate(StockLedger, filter(req), req.query, { populate: [{ path: 'createdBy', select: 'name mobile' }, { path: 'kilnId' }, { path: 'seasonId' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.get = asyncHandler(async (req, res) => { const item = await StockLedger.findById(req.params.id); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.summary = asyncHandler(async (req, res) => { const data = await StockLedger.aggregate([{ $match: filter(req) }, { $group: { _id: { transactionType: '$transactionType', categoryCode: '$categoryCode' }, quantity: { $sum: '$quantity' }, entries: { $sum: 1 } } }, { $sort: { '_id.categoryCode': 1 } }]); return success(res, t('FETCHED', req.lang), data); });
exports.correction = asyncHandler(async (req, res) => { const category = await StockCategory.findById(req.body.categoryId) || await StockCategory.findOne({ code: req.body.categoryCode }); if (!category) return fail(res, 'Stock category not found', 404); const stock = await correctStock({ kilnId: req.body.kilnId || req.user.assignedKilnId, seasonId: req.body.seasonId, categoryId: category._id, quantity: Number(req.body.quantity), sourceModule: 'STOCK_CORRECTION', userId: req.user._id, remark: req.body.remark || req.body.reason }); return created(res, t('CREATED', req.lang), stock); });
exports.approve = asyncHandler(async (req, res) => { const item = await StockLedger.findByIdAndUpdate(req.params.id, { approvalStatus: 'APPROVED', approvedBy: req.user._id }, { new: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.reject = asyncHandler(async (req, res) => { const item = await StockLedger.findByIdAndUpdate(req.params.id, { approvalStatus: 'REJECTED', approvedBy: req.user._id, remark: req.body.rejectionReason }, { new: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
