const admin = require('firebase-admin');
const fs = require('fs');
let initialized = false;
function initFirebase() {
  if (initialized || admin.apps.length) { initialized = true; return admin; }
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  try {
    if (rawJson) {
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(rawJson)) });
      initialized = true;
    } else if (filePath && fs.existsSync(filePath)) {
      const serviceAccount = require(filePath);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      initialized = true;
    }
  } catch (error) { console.warn('Firebase initialization skipped:', error.message); }
  return initialized ? admin : null;
}
async function sendPushNotification({ token, title, body, data = {} }) {
  const firebase = initFirebase();
  if (!firebase || !token) return { skipped: true };
  return firebase.messaging().send({ token, notification: { title, body }, data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v ?? '')])) });
}
module.exports = { initFirebase, sendPushNotification };
