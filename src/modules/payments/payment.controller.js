const Payment = require('./payment.model');
const Udhari = require('../udhari/udhari.model');
const Customer = require('../customers/customer.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.createPayment = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.body.customerId); if (!customer) return fail(res, 'Customer not found', 404);
  const amount = Number(req.body.amount || 0);
  const payment = await Payment.create({ ...req.body, amount, receivedBy: req.user._id });
  if (req.body.udhariId) {
    const udhari = await Udhari.findById(req.body.udhariId); if (udhari) { const applied = Math.min(amount, udhari.pendingAmount); udhari.pendingAmount -= applied; udhari.paidAmount += applied; udhari.status = udhari.pendingAmount <= 0 ? 'PAID' : 'PARTIAL_PAID'; await udhari.save(); }
  }
  customer.totalPaid += amount; customer.outstandingAmount = Math.max(0, customer.outstandingAmount - amount); await customer.save();
  return created(res, t('PAYMENT_RECORDED', req.lang), payment);
});
exports.listPayments = asyncHandler(async (req, res) => { const filter = {}; if (req.user.role === roles.MANAGER) filter.receivedBy = req.user._id; ['customerId','udhariId','orderId','paymentMode'].forEach((k)=>{ if(req.query[k]) filter[k]=req.query[k]; }); const result = await paginate(Payment, filter, req.query, { populate: [{ path: 'customerId' }, { path: 'udhariId' }, { path: 'orderId' }, { path: 'receivedBy', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
