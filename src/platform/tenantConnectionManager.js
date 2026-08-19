const mongoose = require('mongoose');

const cache = new Map();
const connecting = new Map();

function secretFromEnv(envName) {
  if (!envName) return null;
  return process.env[envName] || null;
}

function buildSharedRootUri(tenant) {
  const root = process.env.TENANT_SHARED_MONGO_ROOT_URI;
  if (!root) throw new Error('TENANT_SHARED_MONGO_ROOT_URI is missing for SHARED_ROOT tenant mode');
  const databaseName = tenant.database.databaseName;
  const url = new URL(root);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function resolveTenantMongoUri(tenant) {
  if (tenant.database.mode === 'DEDICATED_URI') {
    const uri = secretFromEnv(tenant.database.uriEnv);
    if (!uri) throw new Error(`Mongo secret env ${tenant.database.uriEnv || '(missing)'} is not configured for tenant ${tenant.code}`);
    return uri;
  }
  return buildSharedRootUri(tenant);
}

async function getTenantConnection(tenant) {
  const key = String(tenant._id);
  const cached = cache.get(key);
  if (cached && cached.readyState === 1) return cached;
  if (connecting.has(key)) return connecting.get(key);

  const promise = (async () => {
    const uri = resolveTenantMongoUri(tenant);
    const connection = mongoose.createConnection(uri, {
      maxPoolSize: Number(process.env.TENANT_DB_MAX_POOL_SIZE || 10),
      minPoolSize: Number(process.env.TENANT_DB_MIN_POOL_SIZE || 0),
      serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
      appName: `bhatta-${tenant.code}`
    });
    await connection.asPromise();
    cache.set(key, connection);
    return connection;
  })();

  connecting.set(key, promise);
  try {
    return await promise;
  } finally {
    connecting.delete(key);
  }
}

async function disconnectTenant(tenantId) {
  const key = String(tenantId);
  const connection = cache.get(key);
  cache.delete(key);
  if (connection) await connection.close();
}

async function closeAllTenantConnections() {
  const connections = Array.from(cache.values());
  cache.clear();
  await Promise.allSettled(connections.map((connection) => connection.close()));
}

module.exports = {
  getTenantConnection,
  disconnectTenant,
  closeAllTenantConnections,
  resolveTenantMongoUri
};
