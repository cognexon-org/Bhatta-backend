const CustomerLedger = require('./customerLedger.model');
const { createCustomerLedgerEntry } = require('./customerLedger.service');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
function filter(req) { const f = {}; ['customerId','kilnId','seasonId','transactionType','sourceModule'].forEach((k)=>{ if(req.query[k]) f[k]=req.query[k]; }); if(req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId=req.user.assignedKilnId; if(req.query.fromDate || req.query.toDate){ f.date={}; if(req.query.fromDate) f.date.$gte=new Date(req.query.fromDate); if(req.query.toDate){ const d=new Date(req.query.toDate); d.setHours(23,59,59,999); f.date.$lte=d; }} return f; }
exports.list = asyncHandler(async (req, res) => { const result = await paginate(CustomerLedger, filter(req), req.query, { populate: [{ path: 'customerId', select: 'name mobile' }, { path: 'createdBy', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.byCustomer = asyncHandler(async (req, res) => { req.query.customerId = req.params.customerId; return exports.list(req, res); });
exports.adjustment = asyncHandler(async (req, res) => { const item = await createCustomerLedgerEntry({ ...req.body, transactionType: 'ADJUSTMENT', sourceModule: 'CUSTOMER_ADJUSTMENT', createdBy: req.user._id }); return created(res, t('CREATED', req.lang), item); });
