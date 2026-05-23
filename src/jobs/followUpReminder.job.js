const Lead = require('../modules/leads/lead.model');
const { createNotification } = require('../modules/notifications/notification.service');
const { startOfDay, endOfDay } = require('../utils/dateHelper');
async function followUpReminderJob() {
  const today = new Date();
  const leads = await Lead.find({ followUpStatus: 'PENDING', followUpDate: { $gte: startOfDay(today), $lte: endOfDay(today) } });
  for (const lead of leads) {
    await createNotification({ userId: lead.assignedManagerId, title: 'Customer follow-up due', message: `Follow up with ${lead.name}${lead.mobile ? ` (${lead.mobile})` : ''}`, type: 'FOLLOW_UP', relatedModule: 'LEAD', relatedId: lead._id });
  }
  return { leads: leads.length };
}
module.exports = followUpReminderJob;
