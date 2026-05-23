const Order = require('./order.model');
const Customer = require('../customers/customer.model');
const Udhari = require('../udhari/udhari.model');
const Stock = require('../stock/stock.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { generateOrderNo } = require('../../utils/generateCode');
const { addDays } = require('../../utils/dateHelper');
const { createNotification } = require('../notifications/notification.service');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');

function calculateItems(items) { return (items || []).map((i) => ({ ...i, amount: i.amount ?? ((Number(i.quantity || 0) / 1000) * Number(i.ratePerThousand || 0)) })); }

exports.createOrder = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.body.customerId); if (!customer) return fail(res, 'Customer not found', 404);
  const items = calculateItems(req.body.items);
  const totalQuantity = items.reduce((s, i) => s + Number(i.quantity || 0), 0);
  const totalAmount = req.body.totalAmount ?? items.reduce((s, i) => s + Number(i.amount || 0), 0);
  const paidAmount = Number(req.body.paidAmount || 0);
  const udhariAmount = req.body.udhariAmount ?? Math.max(totalAmount - paidAmount, 0);
  const order = await Order.create({ ...req.body, orderNo: req.body.orderNo || generateOrderNo(), items, totalQuantity, totalAmount, paidAmount, udhariAmount, villageId: req.body.villageId || customer.villageId, managerId: req.user.role === roles.MANAGER ? req.user._id : (req.body.managerId || customer.assignedManagerId || req.user._id), kilnId: req.body.kilnId || req.user.assignedKilnId });
  customer.totalOrders += 1; customer.totalUdhari += udhariAmount; customer.totalPaid += paidAmount; customer.outstandingAmount += udhariAmount; await customer.save();
  if (udhariAmount > 0) await Udhari.create({ customerId: customer._id, villageId: customer.villageId, managerId: order.managerId, orderId: order._id, amount: udhariAmount, pendingAmount: udhariAmount, paidAmount: 0, udhariDate: new Date(), dueDate: req.body.dueDate || addDays(new Date(), req.body.dueAfterDays || 15), reason: req.body.udhariReason || `₹${udhariAmount} brick sale payment due` });
  if (req.body.reduceStock === true) {
    for (const item of items) {
      if (item.stockCategoryId && order.kilnId) await Stock.findOneAndUpdate({ kilnId: order.kilnId, categoryId: item.stockCategoryId }, { $inc: { availableQuantity: -Number(item.quantity || 0) }, lastUpdatedBy: req.user._id });
    }
  }
  await writeActivityLog({ req, action: 'CREATE_ORDER', module: 'ORDER', moduleId: order._id, description: 'Order created', newData: order });
  return created(res, t('CREATED', req.lang), order);
});

exports.listOrders = asyncHandler(async (req, res) => { const filter = {}; if (req.user.role === roles.MANAGER) filter.managerId = req.user._id; ['customerId','orderStatus','villageId'].forEach((k)=>{ if(req.query[k]) filter[k]=req.query[k]; }); const result = await paginate(Order, filter, req.query, { populate: [{ path: 'customerId' }, { path: 'villageId' }, { path: 'managerId', select: 'name mobile' }, { path: 'kilnId' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.getOrder = asyncHandler(async (req, res) => { const item = await Order.findById(req.params.id).populate('customerId villageId managerId kilnId voiceRemarkId'); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), item); });
exports.updateStatus = asyncHandler(async (req, res) => { const order = await Order.findByIdAndUpdate(req.params.id, { orderStatus: req.body.orderStatus }, { new: true, runValidators: true }); if (!order) return fail(res, t('NOT_FOUND', req.lang), 404); await createNotification({ userId: order.managerId, title: 'Order updated', message: `Order ${order.orderNo} status: ${order.orderStatus}`, type: 'ORDER_UPDATE', relatedModule: 'ORDER', relatedId: order._id }); return success(res, t('UPDATED', req.lang), order); });
exports.updateOrder = asyncHandler(async (req, res) => { const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!order) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), order); });
