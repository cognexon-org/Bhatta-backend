function getPagination(query) { const page = Math.max(parseInt(query.page, 10) || 1, 1); const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100); return { page, limit, skip: (page - 1) * limit }; }
async function paginate(model, filter, query, options = {}) {
  const { page, limit, skip } = getPagination(query);
  let cursor = model.find(filter).sort(options.sort || { createdAt: -1 }).skip(skip).limit(limit);
  (options.populate || []).forEach((p) => { cursor = cursor.populate(p); });
  const [items, total] = await Promise.all([cursor, model.countDocuments(filter)]);
  return { items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}
module.exports = { getPagination, paginate };
