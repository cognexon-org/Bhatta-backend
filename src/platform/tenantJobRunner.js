const { getTenantModel } = require('./tenant.model');
const { getTenantConnection } = require('./tenantConnectionManager');
const { runWithTenant } = require('./tenantContext');

async function runJobForAllTenants(name, job) {
  const Tenant = getTenantModel();
  const tenants = await Tenant.find({ status: 'ACTIVE' });
  const results = [];
  for (const tenant of tenants) {
    try {
      const connection = await getTenantConnection(tenant);
      const result = await runWithTenant({ tenant, connection }, () => job());
      results.push({ tenant: tenant.code, success: true, result });
    } catch (error) {
      console.error(`[job:${name}][tenant:${tenant.code}] failed`, error);
      results.push({ tenant: tenant.code, success: false, error: error.message });
    }
  }
  return results;
}

module.exports = { runJobForAllTenants };
