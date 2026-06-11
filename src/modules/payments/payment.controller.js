const Payment = require('./payment.model');
const Udhari = require('../udhari/udhari.model');
const Customer = require('../customers/customer.model');
const CashTransaction = require('../cashbook/cashTransaction.model');
const { createCustomerLedgerEntry } = require('../customerLedger/customerLedger.service');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.createPayment = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.body.customerId); if (!customer) return fail(res, 'Customer not found', 404);
  const amount = Number(req.body.amount || 0); if (amount <= 0) return fail(res, 'Amount must be greater than zero', 400);
  const kilnId = req.body.kilnId || customer.kilnId || req.user.assignedKilnId;
  const payment = await Payment.create({ ...req.body, kilnId, amount, receivedBy: req.user._id });
  if (req.body.udhariId) {
    const udhari = await Udhari.findById(req.body.udhariId);
    if (udhari) {
      const applied = Math.min(amount, udhari.pendingAmount);
      udhari.pendingAmount -= applied;
      udhari.paidAmount += applied;
      udhari.status = udhari.pendingAmount <= 0 ? 'PAID' : 'PARTIAL_PAID';
      await udhari.save();
    }
  }
  await createCustomerLedgerEntry({ customerId: customer._id, kilnId, seasonId: req.body.seasonId, date: req.body.paymentDate || new Date(), transactionType: 'PAYMENT', sourceModule: 'CUSTOMER_PAYMENT', sourceId: payment._id, debit: 0, credit: amount, remark: req.body.textRemark, createdBy: req.user._id });
  await CashTransaction.create({ kilnId, seasonId: req.body.seasonId, date: req.body.paymentDate || new Date(), transactionType: 'INCOME', sourceModule: 'CUSTOMER_PAYMENT', sourceId: payment._id, amount, paymentMode: req.body.paymentMode || 'CASH', accountType: req.body.accountType || (req.body.paymentMode === 'UPI' ? 'UPI' : req.body.paymentMode === 'BANK_TRANSFER' || req.body.paymentMode === 'CHEQUE' ? 'BANK' : 'CASH'), receivedFrom: customer.name, createdBy: req.user._id, remark: req.body.textRemark });
  return created(res, t('PAYMENT_RECORDED', req.lang), payment);
});
exports.listPayments = asyncHandler(async (req, res) => { const filter = {}; if (req.user.role === roles.MANAGER) filter.receivedBy = req.user._id; ['customerId','udhariId','orderId','dispatchId','paymentMode','kilnId','seasonId'].forEach((k)=>{ if(req.query[k]) filter[k]=req.query[k]; }); const result = await paginate(Payment, filter, req.query, { populate: [{ path: 'customerId' }, { path: 'udhariId' }, { path: 'orderId' }, { path: 'dispatchId' }, { path: 'receivedBy', select: 'name mobile' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.getPayment = asyncHandler(async (req, res) => { const item = await Payment.findById(req.params.id).populate('customerId udhariId orderId dispatchId receivedBy voiceRemarkId'); if(!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.customerPayments = asyncHandler(async (req, res) => { req.query.customerId = req.params.customerId; return exports.listPayments(req, res); });
