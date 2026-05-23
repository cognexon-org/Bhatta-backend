const Worker = require('../workers/worker.model');
const Attendance = require('../attendance/attendance.model');
const Production = require('../production/production.model');
const StockUpdateRequest = require('../stock/stockUpdateRequest.model');
const Order = require('../orders/order.model');
const Udhari = require('../udhari/udhari.model');
const Payment = require('../payments/payment.model');
const Lead = require('../leads/lead.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { startOfDay, endOfDay } = require('../../utils/dateHelper');
const { t } = require('../../constants/messages');
async function summary(managerId = null) {
  const today = new Date();
  const managerFilter = managerId ? { managerId } : {};
  const assignedFilter = managerId ? { assignedManagerId: managerId } : {};
  const [workers, todayAttendance, production, pendingStock, orders, pendingUdhari, overdueUdhari, paymentsToday, followUpsToday] = await Promise.all([
    Worker.countDocuments({ ...assignedFilter, isActive: true }),
    Attendance.countDocuments({ ...managerFilter, date: { $gte: startOfDay(today), $lte: endOfDay(today) } }),
    Production.aggregate([{ $match: managerFilter }, { $group: { _id: '$productionType', quantity: { $sum: '$quantity' } } }]),
    StockUpdateRequest.countDocuments({ ...(managerId ? { managerId } : {}), status: 'PENDING' }),
    Order.countDocuments(managerFilter),
    Udhari.aggregate([{ $match: { ...managerFilter, pendingAmount: { $gt: 0 }, status: { $in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] } } }, { $group: { _id: null, amount: { $sum: '$pendingAmount' }, count: { $sum: 1 } } }]),
    Udhari.countDocuments({ ...managerFilter, dueDate: { $lt: today }, pendingAmount: { $gt: 0 } }),
    Payment.aggregate([{ $match: { ...(managerId ? { receivedBy: managerId } : {}), paymentDate: { $gte: startOfDay(today), $lte: endOfDay(today) } } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Lead.countDocuments({ ...assignedFilter, followUpStatus: 'PENDING', followUpDate: { $gte: startOfDay(today), $lte: endOfDay(today) } })
  ]);
  return { workers, todayAttendance, production, pendingStockRequests: pendingStock, orders, pendingUdhari: pendingUdhari[0] || { amount: 0, count: 0 }, overdueUdhari, paymentsToday: paymentsToday[0] || { amount: 0, count: 0 }, followUpsToday };
}
exports.adminDashboard = asyncHandler(async (req, res) => success(res, t('FETCHED', req.lang), await summary()));
exports.managerDashboard = asyncHandler(async (req, res) => success(res, t('FETCHED', req.lang), await summary(req.user.role === roles.MANAGER ? req.user._id : req.query.managerId)));
