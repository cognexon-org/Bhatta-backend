const CashTransaction = require('./cashTransaction.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
function filter(req) { const f = {}; ['kilnId','seasonId','transactionType','paymentMode','accountType','sourceModule'].forEach((k)=>{ if(req.query[k]) f[k]=req.query[k]; }); if(req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId = req.user.assignedKilnId; if(req.query.fromDate || req.query.toDate){ f.date={}; if(req.query.fromDate) f.date.$gte=new Date(req.query.fromDate); if(req.query.toDate){ const d=new Date(req.query.toDate); d.setHours(23,59,59,999); f.date.$lte=d; }} return f; }
exports.list = asyncHandler(async (req, res) => { const result = await paginate(CashTransaction, filter(req), req.query, { populate: [{ path: 'createdBy', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.manualEntry = asyncHandler(async (req, res) => { const item = await CashTransaction.create({ ...req.body, kilnId: req.body.kilnId || req.user.assignedKilnId, sourceModule: 'MANUAL_ENTRY', createdBy: req.user._id }); return created(res, t('CREATED', req.lang), item); });
exports.summary = asyncHandler(async (req, res) => { const data = await CashTransaction.aggregate([{ $match: filter(req) }, { $group: { _id: '$transactionType', amount: { $sum: '$amount' }, entries: { $sum: 1 } } }]); return success(res, t('FETCHED', req.lang), data); });
exports.dayBook = exports.list;
exports.bankBook = asyncHandler(async (req, res) => { req.query.accountType = req.query.accountType || 'BANK'; return exports.list(req, res); });
