const Notification = require('./notification.model');
const User = require('../users/user.model');
const { sendPushNotification } = require('../../config/onesignal');
const { sendSms } = require('../../config/sms');

async function createNotification({ userId, title, message, type = 'GENERAL', relatedModule, relatedId, sendPush = true, sendSmsToMobile = false }) {
  const sentVia = ['APP'];
  const notification = await Notification.create({ userId, title, message, type, relatedModule, relatedId, sentVia });
  const user = await User.findById(userId);
  if (sendPush && user?.fcmToken) {
    try { await sendPushNotification({ playerIds: [user.fcmToken], title, body: message, data: { notificationId: notification._id, relatedModule, relatedId } }); } catch (error) { console.warn('Push notification failed:', error.message); }
  }
  if (sendSmsToMobile && user?.mobile) {
    try { await sendSms({ mobile: user.mobile, message }); notification.sentVia.push('SMS'); await notification.save(); } catch (error) { console.warn('SMS failed:', error.message); }
  }
  return notification;
}

module.exports = { createNotification };
