const asyncHandler = require('../utils/asyncHandler');
const { success, created, fail } = require('../utils/apiResponse');
const { getTenantModel } = require('./tenant.model');
const { disconnectTenant } = require('./tenantConnectionManager');

function publicTenant(tenant) {
  const obj = tenant.toObject ? tenant.toObject() : { ...tenant };
  if (obj.database) delete obj.database.uri;
  return obj;
}

exports.list = asyncHandler(async (_req, res) => {
  const Tenant = getTenantModel();
  const tenants = await Tenant.find().sort({ createdAt: -1 });
  return success(res, 'Tenants fetched', tenants.map(publicTenant));
});

exports.create = asyncHandler(async (req, res) => {
  const Tenant = getTenantModel();
  const code = String(req.body.code || '').trim().toUpperCase();
  if (!code) return fail(res, 'code is required', 400);
  const existing = await Tenant.findOne({ code });
  if (existing) return fail(res, 'Tenant code already exists', 409);
  const tenant = await Tenant.create({ ...req.body, code });
  return created(res, 'Tenant created', publicTenant(tenant));
});

exports.update = asyncHandler(async (req, res) => {
  const Tenant = getTenantModel();
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!tenant) return fail(res, 'Tenant not found', 404);
  await disconnectTenant(tenant._id);
  return success(res, 'Tenant updated', publicTenant(tenant));
});

exports.remove = asyncHandler(async (req, res) => {
  const Tenant = getTenantModel();
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { status: 'DISABLED' }, { new: true });
  if (!tenant) return fail(res, 'Tenant not found', 404);
  await disconnectTenant(tenant._id);
  return success(res, 'Tenant disabled', publicTenant(tenant));
});

exports.current = asyncHandler(async (req, res) => {
  const tenant = req.tenant;
  return success(res, 'Tenant config fetched', {
    id: tenant._id,
    code: tenant.code,
    name: tenant.name,
    slug: tenant.slug,
    voice: tenant.voice,
    ai: {
      enabled: tenant.ai?.enabled,
      provider: tenant.ai?.provider,
      primary: tenant.ai?.primary,
      fallback: tenant.ai?.fallback
    },
    limits: tenant.limits,
    features: tenant.features
  });
});
