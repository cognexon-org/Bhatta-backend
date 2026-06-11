const Worker = require('../workers/worker.model');
const Attendance = require('../attendance/attendance.model');
const ProcessEntry = require('../processEntries/processEntry.model');
const Stock = require('../stock/stock.model');
const StockUpdateRequest = require('../stock/stockUpdateRequest.model');
const Order = require('../orders/order.model');
const Dispatch = require('../dispatches/dispatch.model');
const Udhari = require('../udhari/udhari.model');
const Payment = require('../payments/payment.model');
const Lead = require('../leads/lead.model');
const Expense = require('../expenses/expense.model');
const FuelStock = require('../fuel/fuelStock.model');
const FuelConsumption = require('../fuel/fuelConsumption.model');
const WorkerLedger = require('../workerLedger/workerLedger.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { startOfDay, endOfDay } = require('../../utils/dateHelper');
const { t } = require('../../constants/messages');

function scoped(req, managerId = null) {
  const f = {};
  if (managerId) f.managerId = managerId;
  if (req.query.kilnId) f.kilnId = req.query.kilnId;
  if (req.query.seasonId) f.seasonId = req.query.seasonId;
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) f.kilnId = req.user.assignedKilnId;
  return f;
}
async function summary(req, managerId = null) {
  const today = new Date();
  const day = { $gte: startOfDay(today), $lte: endOfDay(today) };
  const managerFilter = scoped(req, managerId);
  const assignedFilter = managerId ? { assignedManagerId: managerId } : {};
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) assignedFilter.kilnId = req.user.assignedKilnId;
  const [
    workers,
    todayAttendance,
    todayProcesses,
    processSummary,
    stockSummary,
    fuelStock,
    pendingStock,
    orders,
    dispatchToday,
    pendingUdhari,
    overdueUdhari,
    paymentsToday,
    expensesToday,
    fuelToday,
    workerAdvanceBalance,
    followUpsToday
  ] = await Promise.all([
    Worker.countDocuments({ ...assignedFilter, isActive: true }),
    Attendance.countDocuments({ ...managerFilter, date: day }),
    ProcessEntry.countDocuments({ ...managerFilter, date: day }),
    ProcessEntry.aggregate([{ $match: managerFilter }, { $group: { _id: '$processCode', quantityIn: { $sum: '$quantityIn' }, quantityOut: { $sum: '$quantityOut' }, entries: { $sum: 1 } } }]),
    Stock.aggregate([{ $match: req.user.role === roles.MANAGER && req.user.assignedKilnId ? { kilnId: req.user.assignedKilnId } : (req.query.kilnId ? { kilnId: req.query.kilnId } : {}) }, { $group: { _id: '$categoryCode', availableQuantity: { $sum: '$availableQuantity' } } }]),
    FuelStock.find(req.user.role === roles.MANAGER && req.user.assignedKilnId ? { kilnId: req.user.assignedKilnId } : (req.query.kilnId ? { kilnId: req.query.kilnId } : {})).populate('fuelTypeId'),
    StockUpdateRequest.countDocuments({ ...(managerId ? { managerId } : {}), status: 'PENDING' }),
    Order.countDocuments(managerFilter),
    Dispatch.aggregate([{ $match: { ...managerFilter, dispatchDate: day } }, { $group: { _id: null, totalQuantity: { $sum: '$totalQuantity' }, totalAmount: { $sum: '$totalAmount' }, entries: { $sum: 1 } } }]),
    Udhari.aggregate([{ $match: { ...managerFilter, pendingAmount: { $gt: 0 }, status: { $in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] } } }, { $group: { _id: null, amount: { $sum: '$pendingAmount' }, count: { $sum: 1 } } }]),
    Udhari.countDocuments({ ...managerFilter, dueDate: { $lt: today }, pendingAmount: { $gt: 0 } }),
    Payment.aggregate([{ $match: { ...(managerId ? { receivedBy: managerId } : {}), paymentDate: day } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Expense.aggregate([{ $match: { ...managerFilter, date: day } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    FuelConsumption.aggregate([{ $match: { ...managerFilter, date: day } }, { $group: { _id: null, quantity: { $sum: '$quantity' }, estimatedCost: { $sum: '$estimatedCost' } } }]),
    WorkerLedger.aggregate([{ $match: { ...managerFilter, transactionType: { $in: ['ADVANCE', 'PAYMENT'] } } }, { $group: { _id: null, amount: { $sum: '$credit' }, count: { $sum: 1 } } }]),
    Lead.countDocuments({ ...assignedFilter, followUpStatus: 'PENDING', followUpDate: day })
  ]);
  return {
    workers,
    todayAttendance,
    todayProcesses,
    processSummary,
    stockSummary,
    fuelStock,
    pendingStockRequests: pendingStock,
    orders,
    dispatchToday: dispatchToday[0] || { totalQuantity: 0, totalAmount: 0, entries: 0 },
    pendingUdhari: pendingUdhari[0] || { amount: 0, count: 0 },
    overdueUdhari,
    paymentsToday: paymentsToday[0] || { amount: 0, count: 0 },
    expensesToday: expensesToday[0] || { amount: 0, count: 0 },
    fuelToday: fuelToday[0] || { quantity: 0, estimatedCost: 0 },
    workerAdvanceBalance: workerAdvanceBalance[0] || { amount: 0, count: 0 },
    followUpsToday
  };
}
exports.adminDashboard = asyncHandler(async (req, res) => success(res, t('FETCHED', req.lang), await summary(req)));
exports.managerDashboard = asyncHandler(async (req, res) => success(res, t('FETCHED', req.lang), await summary(req, req.user.role === roles.MANAGER ? req.user._id : req.query.managerId)));
