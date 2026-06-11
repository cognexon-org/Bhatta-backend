const StockCategory = require('./stockCategory.model');
const Stock = require('./stock.model');
const StockUpdateRequest = require('./stockUpdateRequest.model');
const StockAuditLog = require('./stockAuditLog.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { createNotification } = require('../notifications/notification.service');
const User = require('../users/user.model');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');
const { resolveBrickCategory } = require('../../utils/masterData');
const { addStock, reduceStock, correctStock } = require('./stock.service');

exports.createCategory = asyncHandler(async (req, res) => created(res, t('CREATED', req.lang), await StockCategory.create(req.body)));
exports.listCategories = asyncHandler(async (req, res) => { const filter = {}; if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true'; const result = await paginate(StockCategory, filter, req.query); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });

exports.listStock = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.kilnId) filter.kilnId = req.query.kilnId;
  if (req.query.seasonId) filter.seasonId = req.query.seasonId;
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.categoryCode) filter.categoryCode = String(req.query.categoryCode).toUpperCase();
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) filter.kilnId = req.user.assignedKilnId;
  const result = await paginate(Stock, filter, req.query, { populate: [{ path: 'kilnId' }, { path: 'seasonId' }, { path: 'categoryId' }, { path: 'lastUpdatedBy', select: 'name mobile' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.createStockRequest = asyncHandler(async (req, res) => {
  const category = await resolveBrickCategory({ categoryId: req.body.categoryId, categoryCode: req.body.categoryCode });
  const payload = { ...req.body, managerId: req.user.role === roles.MANAGER ? req.user._id : req.body.managerId, kilnId: req.body.kilnId || req.user.assignedKilnId, categoryId: category._id, categoryCode: category.code };
  if (!payload.managerId) payload.managerId = req.user._id;
  const request = await StockUpdateRequest.create(payload);
  const admins = await User.find({ role: roles.ADMIN, isActive: true });
  await Promise.all(admins.map((admin) => createNotification({ userId: admin._id, title: 'Stock approval pending', message: `Stock ${payload.updateType} request for ${category.code}: ${payload.quantity}`, type: 'STOCK_APPROVAL', relatedModule: 'STOCK', relatedId: request._id })));
  await writeActivityLog({ req, action: 'CREATE_STOCK_REQUEST', module: 'STOCK', moduleId: request._id, description: 'Stock request created', newData: request });
  return created(res, t('CREATED', req.lang), request);
});

exports.listStockRequests = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.kilnId) filter.kilnId = req.query.kilnId;
  if (req.query.seasonId) filter.seasonId = req.query.seasonId;
  if (req.query.categoryId) filter.categoryId = req.query.categoryId;
  if (req.query.categoryCode) filter.categoryCode = String(req.query.categoryCode).toUpperCase();
  if (req.user.role === roles.MANAGER) filter.managerId = req.user._id;
  const result = await paginate(StockUpdateRequest, filter, req.query, { populate: [{ path: 'managerId', select: 'name mobile' }, { path: 'kilnId' }, { path: 'categoryId' }, { path: 'approvedBy', select: 'name mobile' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

async function applyStockChange(request, adminId) {
  const before = await Stock.findOne({ kilnId: request.kilnId, seasonId: request.seasonId || null, categoryId: request.categoryId });
  const previousQuantity = before?.availableQuantity || 0;
  let stock;
  const common = { kilnId: request.kilnId, seasonId: request.seasonId, categoryId: request.categoryId, categoryCode: request.categoryCode, quantity: request.quantity, sourceModule: 'STOCK_REQUEST', sourceId: request._id, userId: adminId, remark: request.reason };
  if (request.updateType === 'ADD') stock = await addStock(common);
  if (request.updateType === 'REDUCE') stock = await reduceStock(common);
  if (request.updateType === 'CORRECTION') stock = await correctStock(common);
  await StockAuditLog.create({ kilnId: request.kilnId, stockId: stock._id, stockUpdateRequestId: request._id, categoryCode: request.categoryCode, previousQuantity, changedQuantity: request.quantity, newQuantity: stock.availableQuantity, action: request.updateType, performedBy: adminId, remark: request.reason });
  return stock;
}

exports.approveRequest = asyncHandler(async (req, res) => {
  const request = await StockUpdateRequest.findById(req.params.id);
  if (!request) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (request.status !== 'PENDING') return fail(res, 'Only pending requests can be approved', 400);
  const stock = await applyStockChange(request, req.user._id);
  request.status = 'APPROVED'; request.approvedBy = req.user._id; request.approvedAt = new Date(); await request.save();
  await createNotification({ userId: request.managerId, title: 'Stock request approved', message: `Your stock request was approved. New stock: ${stock.availableQuantity}`, type: 'STOCK_APPROVAL', relatedModule: 'STOCK', relatedId: request._id });
  return success(res, t('STOCK_APPROVED', req.lang), { request, stock });
});

exports.rejectRequest = asyncHandler(async (req, res) => {
  const request = await StockUpdateRequest.findById(req.params.id); if (!request) return fail(res, t('NOT_FOUND', req.lang), 404); if (request.status !== 'PENDING') return fail(res, 'Only pending requests can be rejected', 400);
  request.status = 'REJECTED'; request.approvedBy = req.user._id; request.approvedAt = new Date(); request.rejectionReason = req.body.rejectionReason; await request.save();
  await StockAuditLog.create({ kilnId: request.kilnId, stockUpdateRequestId: request._id, categoryCode: request.categoryCode, previousQuantity: 0, changedQuantity: 0, newQuantity: 0, action: 'REJECTION', performedBy: req.user._id, remark: req.body.rejectionReason });
  await createNotification({ userId: request.managerId, title: 'Stock request rejected', message: req.body.rejectionReason || 'Your stock request was rejected', type: 'STOCK_APPROVAL', relatedModule: 'STOCK', relatedId: request._id });
  return success(res, t('STOCK_REJECTED', req.lang), request);
});

exports.auditLogs = asyncHandler(async (req, res) => { const filter = {}; if (req.query.kilnId) filter.kilnId = req.query.kilnId; const result = await paginate(StockAuditLog, filter, req.query, { populate: [{ path: 'performedBy', select: 'name mobile' }, { path: 'stockUpdateRequestId' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });

exports.stockSummary = asyncHandler(async (req, res) => {
  const mongoose = require('mongoose');
  const match = {};
  if (req.query.kilnId) match.kilnId = new mongoose.Types.ObjectId(req.query.kilnId);
  if (req.query.seasonId) match.seasonId = new mongoose.Types.ObjectId(req.query.seasonId);
  if (req.user.role === roles.MANAGER && req.user.assignedKilnId) match.kilnId = req.user.assignedKilnId;
  const data = await Stock.aggregate([{ $match: match }, { $group: { _id: '$categoryCode', availableQuantity: { $sum: '$availableQuantity' }, reservedQuantity: { $sum: '$reservedQuantity' }, damagedQuantity: { $sum: '$damagedQuantity' } } }, { $sort: { _id: 1 } }]);
  return success(res, t('FETCHED', req.lang), data);
});
