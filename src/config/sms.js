const axios = require('axios');
async function sendSms({ mobile, message }) {
  if (process.env.SMS_ENABLED !== 'true') return { skipped: true, reason: 'SMS_ENABLED is false' };
  if (!process.env.SMS_API_URL || !process.env.SMS_API_KEY) return { skipped: true, reason: 'SMS config missing' };
  const response = await axios.post(process.env.SMS_API_URL, { apiKey: process.env.SMS_API_KEY, senderId: process.env.SMS_SENDER_ID, mobile, message });
  return response.data;
}
module.exports = { sendSms };
