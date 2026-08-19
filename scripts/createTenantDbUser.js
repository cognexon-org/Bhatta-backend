require('dotenv').config();
const mongoose = require('mongoose');

async function main() {
  const adminUri = process.env.MONGO_ADMIN_URI || (process.env.MONGO_ADMIN_USERNAME && process.env.MONGO_ADMIN_PASSWORD
    ? `mongodb://${encodeURIComponent(process.env.MONGO_ADMIN_USERNAME)}:${encodeURIComponent(process.env.MONGO_ADMIN_PASSWORD)}@${process.env.MONGO_ADMIN_HOST || '127.0.0.1:27017'}/admin?authSource=admin&replicaSet=${process.env.MONGO_REPLICA_SET || 'rs0'}`
    : null);
  const dbName = process.env.TENANT_DB_NAME;
  const username = process.env.TENANT_DB_USERNAME;
  const password = process.env.TENANT_DB_PASSWORD;
  if (!adminUri || !dbName || !username || !password) throw new Error('Mongo admin credentials plus TENANT_DB_NAME, TENANT_DB_USERNAME and TENANT_DB_PASSWORD are required');

  const conn = mongoose.createConnection(adminUri);
  await conn.asPromise();
  const db = conn.useDb(dbName).db;
  try {
    await db.command({ createUser: username, pwd: password, roles: [{ role: 'readWrite', db: dbName }] });
    console.log(`Created MongoDB user ${username} restricted to ${dbName}`);
  } catch (error) {
    if (error.codeName === 'DuplicateKey' || /already exists/i.test(error.message)) {
      await db.command({ updateUser: username, pwd: password, roles: [{ role: 'readWrite', db: dbName }] });
      console.log(`Updated MongoDB user ${username} for ${dbName}`);
    } else throw error;
  }
  await conn.close();
}
main().catch((error) => { console.error(error); process.exit(1); });
