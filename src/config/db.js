const mongoose = require('mongoose');
const { closeAllTenantConnections } = require('../platform/tenantConnectionManager');

let masterConnection = null;

async function connectDB() {
  const uri = process.env.MASTER_MONGO_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MASTER_MONGO_URI (or legacy MONGO_URI) is missing');
  mongoose.set('strictQuery', true);
  masterConnection = mongoose.createConnection(uri, {
    maxPoolSize: Number(process.env.MASTER_DB_MAX_POOL_SIZE || 5),
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
    appName: 'bhatta-master'
  });
  await masterConnection.asPromise();
  console.log('Bhatta master database connected');
  return masterConnection;
}

function getMasterConnection() {
  if (!masterConnection || masterConnection.readyState !== 1) {
    throw new Error('Master MongoDB connection is not ready');
  }
  return masterConnection;
}

async function closeDB() {
  await closeAllTenantConnections();
  if (masterConnection) await masterConnection.close();
  masterConnection = null;
}

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.getMasterConnection = getMasterConnection;
module.exports.closeDB = closeDB;
