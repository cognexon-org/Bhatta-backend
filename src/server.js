require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { initOneSignal } = require('./config/onesignal');
const startJobs = require('./jobs');
const PORT = process.env.PORT || 5000;
async function startServer() {
  try {
    await connectDB();
    initOneSignal();
    startJobs();
    app.listen(PORT, () => console.log(`Brick Kiln API running on port ${PORT}`));
  } catch (error) { console.error('Server start failed:', error); process.exit(1); }
}
startServer();
