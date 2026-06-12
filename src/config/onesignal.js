const OneSignal = require('onesignal-node');

// Create a OneSignal Client
let client = null;

function initOneSignal() {
  if (client) return client;

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;

  if (appId && apiKey) {
    client = new OneSignal.Client(appId, apiKey);
  } else {
    console.warn('OneSignal initialization skipped: Missing ONESIGNAL_APP_ID or ONESIGNAL_API_KEY');
  }

  return client;
}

/**
 * Sends a push notification using OneSignal
 * @param {Object} options
 * @param {Array<String>} options.playerIds - Array of OneSignal player/subscription IDs
 * @param {String} options.title
 * @param {String} options.body
 * @param {Object} options.data - Custom payload data
 */
async function sendPushNotification({ playerIds, title, body, data = {} }) {
  const onesignalClient = initOneSignal();
  if (!onesignalClient || !playerIds || playerIds.length === 0) {
    return { skipped: true };
  }

  const notification = {
    contents: {
      'en': body,
    },
    headings: {
      'en': title,
    },
    include_player_ids: playerIds,
    data: data,
  };

  try {
    const response = await onesignalClient.createNotification(notification);
    return response.body;
  } catch (error) {
    console.error('Error sending OneSignal notification:', error);
    return { error: error.message };
  }
}

module.exports = { initOneSignal, sendPushNotification };
