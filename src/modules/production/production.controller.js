const mongoose = require('mongoose');
const Production = require('./production.model');
const VoiceRemark = require('../voiceRemarks/voiceRemark.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { startOfDay, endOfDay } = require('../../utils/dateHelper');
const { buildPublicFileUrl } = require('../../config/storage');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');

exports.createProduction = asyncHandler(async (req, res) => {
  const payload = { ...req.body, managerId: req.user.role === roles.MANAGER ? req.user._id : (req.body.managerId || req.user._id), kilnId: req.body.kilnId || req.user.assignedKilnId };
  const item = await Production.create(payload);
  await writeActivityLog({ req, action: 'CREATE_PRODUCTION', module: 'PRODUCTION', moduleId: item._id, description: 'Production entry created', newData: item });
  return created(res, t('CREATED', req.lang), item);
});

exports.listProduction = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === roles.MANAGER) filter.managerId = req.user._id;
  if (req.query.type) filter.productionType = req.query.type;
  if (req.query.from || req.query.to) filter.date = { ...(req.query.from ? { $gte: startOfDay(req.query.from) } : {}), ...(req.query.to ? { $lte: endOfDay(req.query.to) } : {}) };
  const result = await paginate(Production, filter, req.query, { populate: [{ path: 'managerId', select: 'name mobile' }, { path: 'kilnId' }, { path: 'voiceRemarkId' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.summary = asyncHandler(async (req, res) => {
  const match = {};
  if (req.user.role === roles.MANAGER) match.managerId = req.user._id;
  if (req.query.from || req.query.to) match.date = { ...(req.query.from ? { $gte: startOfDay(req.query.from) } : {}), ...(req.query.to ? { $lte: endOfDay(req.query.to) } : {}) };
  const data = await Production.aggregate([{ $match: match }, { $group: { _id: '$productionType', totalQuantity: { $sum: '$quantity' }, entries: { $sum: 1 } } }]);
  return success(res, t('FETCHED', req.lang), data);
});

exports.workerReport = asyncHandler(async (req, res) => {
  const match = { 'workerContributions.workerId': req.params.workerId };
  if (req.query.from || req.query.to) match.date = { ...(req.query.from ? { $gte: startOfDay(req.query.from) } : {}), ...(req.query.to ? { $lte: endOfDay(req.query.to) } : {}) };
  const data = await Production.aggregate([{ $unwind: '$workerContributions' }, { $match: { ...match, 'workerContributions.workerId': new mongoose.Types.ObjectId(req.params.workerId) } }, { $group: { _id: '$productionType', quantity: { $sum: '$workerContributions.quantity' }, entries: { $sum: 1 } } }]);
  return success(res, t('FETCHED', req.lang), data);
});

exports.uploadVoiceRemark = asyncHandler(async (req, res) => {
  const item = await Production.findById(req.params.productionId); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); if (!req.file) return fail(res, 'voiceNote file is required', 400);
  const voice = await VoiceRemark.create({ uploadedBy: req.user._id, relatedModule: 'PRODUCTION', relatedId: item._id, fileUrl: buildPublicFileUrl(req.file.filename), fileName: req.file.filename, mimeType: req.file.mimetype, sizeInBytes: req.file.size });
  item.voiceRemarkId = voice._id; await item.save(); return created(res, t('CREATED', req.lang), voice);
});
