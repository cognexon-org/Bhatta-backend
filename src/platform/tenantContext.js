const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithTenant(context, fn) {
  return storage.run(context, fn);
}

function getTenantContext({ optional = false } = {}) {
  const context = storage.getStore();
  if (!context && !optional) {
    throw new Error('Tenant context is not available for this operation');
  }
  return context || null;
}

function getTenantConnection() {
  return getTenantContext().connection;
}

function getCurrentTenant() {
  return getTenantContext().tenant;
}

module.exports = {
  runWithTenant,
  getTenantContext,
  getTenantConnection,
  getCurrentTenant
};
