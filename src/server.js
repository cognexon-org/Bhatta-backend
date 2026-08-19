require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { closeDB } = require('./config/db');
const { initOneSignal } = require('./config/onesignal');
const startJobs = require('./jobs');
const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();
    initOneSignal();
    startJobs();
    const server = app.listen(PORT, () => console.log(`Multi-tenant Brick Kiln API running on port ${PORT}`));

    async function shutdown(signal) {
      console.log(`${signal} received, shutting down...`);
      server.close(async () => {
        await closeDB().catch((error) => console.error('DB shutdown error', error));
        process.exit(0);
      });
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Server start failed:', error);
    process.exit(1);
  }
}
startServer();
