const Customer = require('./customer.model');
const Order = require('../orders/order.model');
const Udhari = require('../udhari/udhari.model');
const Payment = require('../payments/payment.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
function scope(req, filter = {}) { if (req.user.role === roles.MANAGER) filter.assignedManagerId = req.user._id; return filter; }
exports.createCustomer = asyncHandler(async (req, res) => { const payload = { ...req.body }; if (req.user.role === roles.MANAGER) payload.assignedManagerId = req.user._id; const item = await Customer.create(payload); return created(res, t('CREATED', req.lang), item); });
exports.listCustomers = asyncHandler(async (req, res) => { const filter = scope(req, {}); ['villageId','customerType'].forEach((k)=>{ if(req.query[k]) filter[k]=req.query[k]; }); if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { mobile: new RegExp(req.query.search, 'i') }, { beatName: new RegExp(req.query.search, 'i') }]; const result = await paginate(Customer, filter, req.query, { populate: [{ path: 'villageId' }, { path: 'assignedManagerId', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.getCustomer = asyncHandler(async (req, res) => { const item = await Customer.findById(req.params.id).populate('villageId assignedManagerId'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.updateCustomer = asyncHandler(async (req, res) => { const item = await Customer.findOneAndUpdate(scope(req, { _id: req.params.id }), req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.ledger = asyncHandler(async (req, res) => { const customer = await Customer.findById(req.params.id).populate('villageId'); if (!customer) return fail(res, t('NOT_FOUND', req.lang), 404); const [orders, udhari, payments] = await Promise.all([Order.find({ customerId: customer._id }).sort({ createdAt: -1 }), Udhari.find({ customerId: customer._id }).sort({ createdAt: -1 }), Payment.find({ customerId: customer._id }).sort({ paymentDate: -1 })]); return success(res, t('FETCHED', req.lang), { customer, orders, udhari, payments, summary: { totalOrders: customer.totalOrders, totalUdhari: customer.totalUdhari, totalPaid: customer.totalPaid, outstandingAmount: customer.outstandingAmount } }); });
