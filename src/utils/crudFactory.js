const asyncHandler = require('./asyncHandler');
const { success, created, fail } = require('./apiResponse');
const { paginate } = require('./paginate');
const { t } = require('../constants/messages');

function managerScope(req, filter = {}) {
  if (req.user && req.user.role === 'MANAGER' && req.user.assignedKilnId && !filter.kilnId) {
    filter.kilnId = req.user.assignedKilnId;
  }
  return filter;
}

function buildFilter(req, keys = []) {
  const filter = {};
  keys.forEach((key) => { if (req.query[key] !== undefined && req.query[key] !== '') filter[key] = req.query[key]; });
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.fromDate || req.query.toDate) {
    const field = req.query.dateField || 'date';
    filter[field] = {};
    if (req.query.fromDate) filter[field].$gte = new Date(req.query.fromDate);
    if (req.query.toDate) {
      const end = new Date(req.query.toDate); end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
}

function list(Model, keys = [], options = {}) {
  return asyncHandler(async (req, res) => {
    const filter = options.skipScope ? buildFilter(req, keys) : managerScope(req, buildFilter(req, keys));
    if (req.query.search && options.searchFields && options.searchFields.length) {
      filter.$or = options.searchFields.map((field) => ({ [field]: new RegExp(req.query.search, 'i') }));
    }
    const result = await paginate(Model, filter, req.query, { populate: options.populate || [] });
    return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
  });
}

function get(Model, populate = []) {
  return asyncHandler(async (req, res) => {
    let query = Model.findById(req.params.id);
    populate.forEach((p) => { query = query.populate(p); });
    const item = await query;
    if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
    return success(res, t('FETCHED', req.lang), item);
  });
}

function create(Model, decorate = null) {
  return asyncHandler(async (req, res) => {
    const payload = decorate ? await decorate(req) : { ...req.body };
    if (req.user && !payload.createdBy) payload.createdBy = req.user._id;
    if (req.user && req.user.role === 'MANAGER' && req.user.assignedKilnId && !payload.kilnId) payload.kilnId = req.user.assignedKilnId;
    const item = await Model.create(payload);
    return created(res, t('CREATED', req.lang), item);
  });
}

function update(Model) {
  return asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
    return success(res, t('UPDATED', req.lang), item);
  });
}

function deactivate(Model) {
  return asyncHandler(async (req, res) => {
    const item = await Model.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
    return success(res, t('UPDATED', req.lang), item);
  });
}

module.exports = { list, get, create, update, deactivate, buildFilter, managerScope };
