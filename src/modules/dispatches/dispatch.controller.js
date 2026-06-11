const Dispatch = require('./dispatch.model');
const Order = require('../orders/order.model');
const Customer = require('../customers/customer.model');
const Udhari = require('../udhari/udhari.model');
const Payment = require('../payments/payment.model');
const CashTransaction = require('../cashbook/cashTransaction.model');
const { reduceStock } = require('../stock/stock.service');
const { createCustomerLedgerEntry } = require('../customerLedger/customerLedger.service');
const { generateDispatchNo, generateChallanNo } = require('../../utils/generateCode');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
const { runWithOptionalTransaction } = require('../../utils/optionalTransaction');
const { resolveBrickCategory } = require('../../utils/masterData');

function calcItems(items) { return (items || []).map((i) => ({ ...i, amount: i.amount ?? ((Number(i.quantity || 0) / 1000) * Number(i.ratePerThousand || 0)) })); }
function filter(req) {
  const f = {};
  ['kilnId', 'seasonId', 'orderId', 'customerId', 'deliveryStatus', 'vehicleId'].forEach((k) => { if (req.query[k]) f[k] = req.query[k]; });
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId = req.user.assignedKilnId;
  if (req.query.fromDate || req.query.toDate) { f.dispatchDate = {}; if (req.query.fromDate) f.dispatchDate.$gte = new Date(req.query.fromDate); if (req.query.toDate) { const d = new Date(req.query.toDate); d.setHours(23, 59, 59, 999); f.dispatchDate.$lte = d; } }
  return f;
}

exports.list = asyncHandler(async (req, res) => {
  const result = await paginate(Dispatch, filter(req), req.query, { populate: [{ path: 'customerId' }, { path: 'orderId' }, { path: 'vehicleId' }, { path: 'createdBy', select: 'name mobile' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

async function createDispatchCore(req, session) {
  const customer = await Customer.findById(req.body.customerId).session(session || null);
  if (!customer) throw new Error('Customer not found');
  const order = req.body.orderId ? await Order.findById(req.body.orderId).session(session || null) : null;
  const rawItems = req.body.items || (order ? order.items : []);
  if (!rawItems.length) throw new Error('Dispatch items are required');

  const items = [];
  for (const item of calcItems(rawItems)) {
    const category = await resolveBrickCategory({ categoryId: item.stockCategoryId || item.categoryId, categoryCode: item.categoryCode, allowDispatch: true });
    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) throw new Error('Dispatch quantity must be greater than zero');
    items.push({ ...item, stockCategoryId: category._id, categoryCode: category.code, categoryName: category.name, quantity });
  }

  const kilnId = req.body.kilnId || (order && order.kilnId) || customer.kilnId || req.user.assignedKilnId;
  if (!kilnId) throw new Error('kilnId is required');
  const seasonId = req.body.seasonId || (order && order.seasonId);
  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const totalAmount = req.body.totalAmount ?? items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const paidAmount = Number(req.body.paidAmount || 0);

  if (order && order.totalQuantity && (Number(order.dispatchedQuantity || 0) + totalQuantity) > Number(order.totalQuantity)) throw new Error('Dispatch quantity cannot exceed order quantity');

  const rows = await Dispatch.create([{ ...req.body, dispatchNo: req.body.dispatchNo || generateDispatchNo(), challanNo: req.body.challanNo || generateChallanNo(), items, totalQuantity, totalAmount, paidAmount, kilnId, seasonId, createdBy: req.user._id }], session ? { session } : undefined);
  const dispatch = rows[0];

  for (const item of items) await reduceStock({ kilnId, seasonId, categoryId: item.stockCategoryId, categoryCode: item.categoryCode, quantity: Number(item.quantity || 0), sourceModule: 'DISPATCH', sourceId: dispatch._id, userId: req.user._id, remark: req.body.textRemark, date: dispatch.dispatchDate, allowDispatch: true, session });

  await createCustomerLedgerEntry({ customerId: customer._id, kilnId, seasonId, date: dispatch.dispatchDate, transactionType: 'SALE', sourceModule: 'DISPATCH', sourceId: dispatch._id, debit: totalAmount, credit: 0, remark: req.body.textRemark, createdBy: req.user._id, session });

  if (paidAmount > 0) {
    const payRows = await Payment.create([{ customerId: customer._id, dispatchId: dispatch._id, orderId: order ? order._id : undefined, kilnId, seasonId, amount: paidAmount, paymentMode: req.body.paymentMode || 'CASH', paymentDate: dispatch.dispatchDate, receivedBy: req.user._id, textRemark: req.body.textRemark }], session ? { session } : undefined);
    const payment = payRows[0];
    await createCustomerLedgerEntry({ customerId: customer._id, kilnId, seasonId, date: dispatch.dispatchDate, transactionType: 'PAYMENT', sourceModule: 'DISPATCH_PAYMENT', sourceId: payment._id, debit: 0, credit: paidAmount, remark: req.body.textRemark, createdBy: req.user._id, session });
    await CashTransaction.create([{ kilnId, seasonId, date: dispatch.dispatchDate, transactionType: 'INCOME', sourceModule: 'CUSTOMER_PAYMENT', sourceId: payment._id, amount: paidAmount, paymentMode: req.body.paymentMode || 'CASH', accountType: req.body.accountType || 'CASH', receivedFrom: customer.name, createdBy: req.user._id, remark: req.body.textRemark }], session ? { session } : undefined);
  }

  const due = Math.max(totalAmount - paidAmount, 0);
  if (due > 0) await Udhari.create([{ customerId: customer._id, villageId: customer.villageId, managerId: req.user.role === roles.MANAGER ? req.user._id : (req.body.managerId || customer.assignedManagerId || req.user._id), kilnId, seasonId, orderId: order ? order._id : undefined, dispatchId: dispatch._id, amount: due, pendingAmount: due, paidAmount: 0, udhariDate: dispatch.dispatchDate, dueDate: req.body.dueDate, reason: req.body.udhariReason || 'Dispatch payment due' }], session ? { session } : undefined);

  if (order) {
    order.dispatchedQuantity = Number(order.dispatchedQuantity || 0) + totalQuantity;
    order.orderStatus = order.dispatchedQuantity >= order.totalQuantity ? 'DISPATCHED' : 'PARTIAL_DISPATCHED';
    await order.save(session ? { session } : undefined);
  }
  return dispatch;
}

exports.create = asyncHandler(async (req, res) => {
  const dispatch = await runWithOptionalTransaction((session) => createDispatchCore(req, session));
  return created(res, t('CREATED', req.lang), dispatch);
});
exports.get = asyncHandler(async (req, res) => { const item = await Dispatch.findById(req.params.id).populate('customerId orderId vehicleId loadingWorkerIds voiceRemarkId'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.update = asyncHandler(async (req, res) => { const item = await Dispatch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.status = asyncHandler(async (req, res) => { const item = await Dispatch.findByIdAndUpdate(req.params.id, { deliveryStatus: req.body.deliveryStatus }, { new: true, runValidators: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.challan = asyncHandler(async (req, res) => { const item = await Dispatch.findById(req.params.id).populate('customerId orderId vehicleId'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), { type: 'CHALLAN', dispatch: item }); });
exports.invoice = asyncHandler(async (req, res) => { const item = await Dispatch.findById(req.params.id).populate('customerId orderId vehicleId'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), { type: 'INVOICE', dispatch: item }); });
