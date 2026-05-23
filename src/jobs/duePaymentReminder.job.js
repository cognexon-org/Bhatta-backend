const Udhari = require('../modules/udhari/udhari.model');
const { createNotification } = require('../modules/notifications/notification.service');
const { startOfDay, endOfDay, addDays } = require('../utils/dateHelper');

async function duePaymentReminderJob() {
  const today = new Date();
  const upcoming = await Udhari.find({ reminderEnabled: true, pendingAmount: { $gt: 0 }, status: { $in: ['PENDING', 'PARTIAL_PAID', 'OVERDUE'] }, dueDate: { $gte: startOfDay(today), $lte: endOfDay(addDays(today, 1)) } }).populate('customerId');
  for (const item of upcoming) {
    await createNotification({ userId: item.managerId, title: 'Payment due reminder', message: `₹${item.pendingAmount} payment due for ${item.customerId?.name || 'customer'}`, type: 'PAYMENT_DUE', relatedModule: 'UDHARI', relatedId: item._id });
  }
  const overdue = await Udhari.updateMany({ pendingAmount: { $gt: 0 }, status: { $in: ['PENDING', 'PARTIAL_PAID'] }, dueDate: { $lt: startOfDay(today) } }, { status: 'OVERDUE' });
  return { upcoming: upcoming.length, overdueUpdated: overdue.modifiedCount || 0 };
}
module.exports = duePaymentReminderJob;
