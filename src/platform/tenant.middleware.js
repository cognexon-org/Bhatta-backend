const { verifyToken } = require('../config/jwt');
const { fail } = require('../utils/apiResponse');
const { getTenantModel } = require('./tenant.model');
const { getTenantConnection } = require('./tenantConnectionManager');
const { runWithTenant } = require('./tenantContext');

function bearerTenant(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.tenantId || decoded.tenantCode || null;
  } catch (_) {
    return null;
  }
}

async function tenantMiddleware(req, res, next) {
  try {
    const tenantHint = req.headers['x-tenant-code'] || req.body?.tenantCode || req.query?.tenantCode || bearerTenant(req);
    if (!tenantHint) return fail(res, 'Tenant code is required', 400);

    const Tenant = getTenantModel();
    const isObjectId = /^[a-f\d]{24}$/i.test(String(tenantHint));
    const tenant = await Tenant.findOne(isObjectId ? { _id: tenantHint } : { code: String(tenantHint).toUpperCase() });
    if (!tenant || tenant.status !== 'ACTIVE') return fail(res, 'Tenant is unavailable', 403);

    const connection = await getTenantConnection(tenant);
    req.tenant = tenant;
    req.tenantCode = tenant.code;
    return runWithTenant({ tenant, connection }, () => next());
  } catch (error) {
    return next(error);
  }
}

module.exports = tenantMiddleware;
