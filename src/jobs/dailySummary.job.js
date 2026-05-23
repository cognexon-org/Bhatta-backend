const Attendance = require('../modules/attendance/attendance.model');
const Production = require('../modules/production/production.model');
const Payment = require('../modules/payments/payment.model');
const User = require('../modules/users/user.model');
const roles = require('../constants/roles');
const { createNotification } = require('../modules/notifications/notification.service');
const { startOfDay, endOfDay } = require('../utils/dateHelper');
async function dailySummaryJob() {
  const today = new Date();
  const [attendanceCount, production, payments, admins] = await Promise.all([
    Attendance.countDocuments({ date: { $gte: startOfDay(today), $lte: endOfDay(today) } }),
    Production.aggregate([{ $match: { date: { $gte: startOfDay(today), $lte: endOfDay(today) } } }, { $group: { _id: '$productionType', quantity: { $sum: '$quantity' } } }]),
    Payment.aggregate([{ $match: { paymentDate: { $gte: startOfDay(today), $lte: endOfDay(today) } } }, { $group: { _id: null, amount: { $sum: '$amount' } } }]),
    User.find({ role: roles.ADMIN, isActive: true })
  ]);
  const paymentAmount = payments[0]?.amount || 0;
  const productionText = production.map((p) => `${p._id}: ${p.quantity}`).join(', ') || 'No production entries';
  for (const admin of admins) {
    await createNotification({ userId: admin._id, title: 'Daily kiln summary', message: `Attendance: ${attendanceCount}. Production: ${productionText}. Payments: ₹${paymentAmount}`, type: 'GENERAL', relatedModule: 'DASHBOARD' });
  }
  return { attendanceCount, production, paymentAmount };
}
module.exports = dailySummaryJob;
