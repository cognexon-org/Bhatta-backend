const cron = require('node-cron');
const duePaymentReminderJob = require('./duePaymentReminder.job');
const followUpReminderJob = require('./followUpReminder.job');
const dailySummaryJob = require('./dailySummary.job');
function runSafely(name, fn) { fn().then((r) => console.log(`[job:${name}]`, r)).catch((e) => console.error(`[job:${name}] failed`, e.message)); }
function startJobs() {
  if (process.env.NODE_ENV === 'test') return;
  cron.schedule('0 8 * * *', () => runSafely('due-payment-reminder', duePaymentReminderJob));
  cron.schedule('0 9 * * *', () => runSafely('follow-up-reminder', followUpReminderJob));
  cron.schedule('0 20 * * *', () => runSafely('daily-summary', dailySummaryJob));
  console.log('Cron jobs scheduled');
}
module.exports = startJobs;
