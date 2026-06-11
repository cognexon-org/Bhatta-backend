const ProcessEntry = require('./processEntry.model');
const Process = require('../processes/process.model');
const Chamber = require('../chambers/chamber.model');
const Worker = require('../workers/worker.model');
const FuelStock = require('../fuel/fuelStock.model');
const FuelConsumption = require('../fuel/fuelConsumption.model');
const VoiceRemark = require('../voiceRemarks/voiceRemark.model');
const { addStock, reduceStock, transferStock } = require('../stock/stock.service');
const { createWorkerLedgerEntry } = require('../workerLedger/workerLedger.service');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { buildPublicFileUrl } = require('../../config/storage');
const { t } = require('../../constants/messages');
const { runWithOptionalTransaction } = require('../../utils/optionalTransaction');
const { resolveProcess, resolveBrickCategory, resolveFuelType, normalizeCode } = require('../../utils/masterData');

function dateFilter(req, filter) {
  if (req.query.fromDate || req.query.toDate || req.query.from || req.query.to) {
    filter.date = {};
    const from = req.query.fromDate || req.query.from;
    const to = req.query.toDate || req.query.to;
    if (from) filter.date.$gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); filter.date.$lte = d; }
  }
}

function buildFilter(req) {
  const f = {};
  ['kilnId', 'seasonId', 'managerId', 'processId', 'processCode', 'chamberId', 'approvalStatus'].forEach((k) => { if (req.query[k]) f[k] = req.query[k]; });
  if (req.user.role === roles.MANAGER) f.managerId = req.user._id;
  dateFilter(req, f);
  return f;
}

function amountForContribution(c) {
  if (c.amount !== undefined) return Number(c.amount || 0);
  return (Number(c.quantity || 0) / (String(c.unit || '').includes('1000') ? 1000 : 1)) * Number(c.rate || 0);
}

async function buildProcessPayload(req) {
  const process = await resolveProcess({ processId: req.body.processId, processCode: req.body.processCode });
  const payload = {
    ...req.body,
    processId: process._id,
    processCode: process.code,
    processName: process.name,
    processNameHindi: process.nameHindi,
    managerId: req.user.role === roles.MANAGER ? req.user._id : (req.body.managerId || req.user._id),
    kilnId: req.body.kilnId || req.user.assignedKilnId,
    createdBy: req.user._id
  };
  if (!payload.kilnId) throw new Error('kilnId is required');

  if (process.requiresChamber && !payload.chamberId) throw new Error(`${process.code} requires chamberId`);
  if (process.requiresWorkers && (!Array.isArray(payload.workerContributions) || !payload.workerContributions.length)) throw new Error(`${process.code} requires workerContributions`);
  if (process.requiresFuel && (!Array.isArray(payload.fuelConsumptions) || !payload.fuelConsumptions.length)) throw new Error(`${process.code} requires fuelConsumptions`);

  if (payload.fromStockCategoryId || payload.fromCategoryCode) {
    const from = await resolveBrickCategory({ categoryId: payload.fromStockCategoryId, categoryCode: payload.fromCategoryCode });
    payload.fromStockCategoryId = from._id;
    payload.fromCategoryCode = from.code;
  }
  if (payload.toStockCategoryId || payload.toCategoryCode) {
    const to = await resolveBrickCategory({ categoryId: payload.toStockCategoryId, categoryCode: payload.toCategoryCode });
    payload.toStockCategoryId = to._id;
    payload.toCategoryCode = to.code;
  }

  payload.outputs = [];
  for (const out of req.body.outputs || []) {
    const category = await resolveBrickCategory({ categoryId: out.stockCategoryId || out.categoryId, categoryCode: out.categoryCode });
    payload.outputs.push({ stockCategoryId: category._id, categoryCode: category.code, categoryName: category.name, categoryNameHindi: category.nameHindi, quantity: Number(out.quantity || 0) });
  }

  const outputTotal = payload.outputs.reduce((sum, out) => sum + Number(out.quantity || 0), 0);
  if (payload.processCode === 'CHHANTAI' && Number(payload.quantityIn || 0) > 0 && outputTotal > Number(payload.quantityIn || 0) && !req.body.allowOutputGreaterThanInput) {
    throw new Error('Chhantai output total cannot exceed quantityIn');
  }

  payload.workerContributions = [];
  for (const c of req.body.workerContributions || []) {
    const worker = await Worker.findById(c.workerId).populate('categoryId');
    if (!worker || !worker.isActive) throw new Error(`Invalid or inactive worker: ${c.workerId}`);
    if (req.user.role === roles.MANAGER && String(worker.assignedManagerId || '') !== String(req.user._id)) throw new Error('Worker is not assigned to this manager');
    payload.workerContributions.push({
      workerId: worker._id,
      categoryId: worker.categoryId?._id || worker.categoryId,
      categoryCode: c.categoryCode ? normalizeCode(c.categoryCode) : worker.categoryCode,
      categoryName: worker.categoryName || worker.categoryId?.name,
      categoryNameHindi: worker.categoryNameHindi || worker.categoryId?.nameHindi,
      quantity: Number(c.quantity || 0),
      unit: c.unit || worker.categoryId?.unit,
      rate: c.rate !== undefined ? Number(c.rate || 0) : Number(worker.pieceRate || worker.dailyWage || 0),
      amount: c.amount !== undefined ? Number(c.amount || 0) : amountForContribution({ ...c, unit: c.unit || worker.categoryId?.unit, rate: c.rate !== undefined ? c.rate : (worker.pieceRate || worker.dailyWage || 0) }),
      remark: c.remark
    });
  }

  payload.fuelConsumptions = [];
  for (const f of req.body.fuelConsumptions || []) {
    const type = await resolveFuelType({ fuelTypeId: f.fuelTypeId, fuelCode: f.fuelCode });
    payload.fuelConsumptions.push({ fuelTypeId: type._id, fuelCode: type.code, quantity: Number(f.quantity || 0), estimatedCost: Number(f.estimatedCost || 0) });
  }

  return { payload, process };
}

async function updateChamberForProcess(entry, session) {
  if (!entry.chamberId) return;
  const chamber = await Chamber.findById(entry.chamberId).session(session || null);
  if (!chamber) throw new Error('Chamber not found');
  const qty = Number(entry.quantityOut || entry.quantityIn || 0);
  if (entry.processCode === 'BHARAI') { chamber.currentQuantity += qty; chamber.status = chamber.capacity && chamber.currentQuantity >= chamber.capacity ? 'LOADED' : 'LOADING'; }
  if (entry.processCode === 'PHUKAI') chamber.status = 'FIRING';
  if (entry.processCode === 'PAKAI') chamber.status = 'COOLING';
  if (entry.processCode === 'NIKASI') chamber.status = 'READY_FOR_NIKASI';
  if (entry.processCode === 'CHHANTAI') { chamber.currentQuantity = Math.max(0, chamber.currentQuantity - Number(entry.quantityIn || 0)); chamber.status = chamber.currentQuantity <= 0 ? 'EMPTY' : 'COMPLETED'; }
  chamber.lastProcessEntryId = entry._id;
  chamber.lastProcessDate = entry.date;
  await chamber.save(session ? { session } : undefined);
}

async function applyStockEffects(entry, userId, session) {
  const common = { kilnId: entry.kilnId, seasonId: entry.seasonId, sourceModule: 'PROCESS_ENTRY', sourceId: entry._id, userId, date: entry.date, remark: entry.textRemark, session };
  const qtyOut = Number(entry.quantityOut || entry.quantityIn || 0);
  if (entry.processCode === 'PATHAI') await addStock({ ...common, categoryId: entry.toStockCategoryId, categoryCode: entry.toCategoryCode || 'KACCHA_EENT', quantity: qtyOut });
  if (entry.processCode === 'SUKHAI') await transferStock({ ...common, fromCategoryId: entry.fromStockCategoryId, fromCategoryCode: entry.fromCategoryCode || 'KACCHA_EENT', toCategoryId: entry.toStockCategoryId, toCategoryCode: entry.toCategoryCode || 'SUKHI_EENT', quantity: qtyOut });
  if (entry.processCode === 'BHARAI') await reduceStock({ ...common, categoryId: entry.fromStockCategoryId, categoryCode: entry.fromCategoryCode || 'SUKHI_EENT', quantity: qtyOut });
  if (entry.processCode === 'STOCK_TRANSFER') await transferStock({ ...common, fromCategoryId: entry.fromStockCategoryId, fromCategoryCode: entry.fromCategoryCode, toCategoryId: entry.toStockCategoryId, toCategoryCode: entry.toCategoryCode, quantity: qtyOut });
  if (entry.processCode === 'CHHANTAI') for (const out of entry.outputs || []) await addStock({ ...common, categoryId: out.stockCategoryId, categoryCode: out.categoryCode, quantity: Number(out.quantity || 0) });
}

async function applyWorkerEffects(entry, userId, session) {
  for (const c of entry.workerContributions || []) {
    if (!c.workerId) continue;
    const amount = amountForContribution(c);
    if (amount <= 0) continue;
    await createWorkerLedgerEntry({ workerId: c.workerId, kilnId: entry.kilnId, seasonId: entry.seasonId, managerId: entry.managerId, date: entry.date, transactionType: 'EARNING', sourceModule: 'PROCESS_ENTRY', sourceId: entry._id, processCode: entry.processCode, quantity: c.quantity, unit: c.unit, rate: c.rate, amount, remark: c.remark || entry.textRemark, createdBy: userId, session });
  }
}

async function applyFuelEffects(entry, userId, session) {
  const ids = [];
  for (const f of entry.fuelConsumptions || []) {
    const type = await resolveFuelType({ fuelTypeId: f.fuelTypeId, fuelCode: f.fuelCode });
    let stock = await FuelStock.findOne({ kilnId: entry.kilnId, seasonId: entry.seasonId || null, fuelTypeId: type._id }).session(session || null);
    if (!stock) throw new Error(`Fuel stock not found for ${type.code}`);
    if (stock.availableQuantity < Number(f.quantity || 0)) throw new Error(`Insufficient fuel stock for ${type.code}`);
    stock.availableQuantity -= Number(f.quantity || 0);
    stock.lastUpdatedBy = userId;
    await stock.save(session ? { session } : undefined);
    const rows = await FuelConsumption.create([{ kilnId: entry.kilnId, seasonId: entry.seasonId, processEntryId: entry._id, chamberId: entry.chamberId, fuelTypeId: type._id, date: entry.date, quantity: f.quantity, estimatedCost: f.estimatedCost || 0, consumedBy: userId, remark: entry.textRemark }], session ? { session } : undefined);
    ids.push(rows[0]._id);
  }
  if (ids.length) { entry.fuelConsumptionIds = ids; await entry.save(session ? { session } : undefined); }
}

async function createProcessEntryCore(req, session) {
  const { payload } = await buildProcessPayload(req);
  const rows = await ProcessEntry.create([payload], session ? { session } : undefined);
  const entry = rows[0];
  await applyStockEffects(entry, req.user._id, session);
  await updateChamberForProcess(entry, session);
  await applyWorkerEffects(entry, req.user._id, session);
  await applyFuelEffects(entry, req.user._id, session);
  return entry;
}

exports.create = asyncHandler(async (req, res) => {
  const entry = await runWithOptionalTransaction((session) => createProcessEntryCore(req, session));
  return created(res, t('CREATED', req.lang), await ProcessEntry.findById(entry._id).populate('processId chamberId workerContributions.workerId fuelConsumptionIds'));
});

exports.list = asyncHandler(async (req, res) => {
  const result = await paginate(ProcessEntry, buildFilter(req), req.query, { populate: [{ path: 'processId' }, { path: 'managerId', select: 'name mobile' }, { path: 'kilnId' }, { path: 'seasonId' }, { path: 'chamberId' }, { path: 'voiceRemarkId' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.get = asyncHandler(async (req, res) => {
  const item = await ProcessEntry.findById(req.params.id).populate('processId managerId kilnId seasonId chamberId workerContributions.workerId workerContributions.categoryId fuelConsumptionIds voiceRemarkId');
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('FETCHED', req.lang), item);
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await ProcessEntry.findById(req.params.id);
  if (!existing) return fail(res, t('NOT_FOUND', req.lang), 404);
  const process = req.body.processCode || req.body.processId ? await resolveProcess({ processId: req.body.processId || existing.processId, processCode: req.body.processCode || existing.processCode }) : null;
  const payload = { ...req.body, updatedBy: req.user._id };
  if (process) { payload.processId = process._id; payload.processCode = process.code; payload.processName = process.name; payload.processNameHindi = process.nameHindi; }
  Object.assign(existing, payload);
  await existing.save();
  return success(res, t('UPDATED', req.lang), existing);
});

exports.remove = asyncHandler(async (req, res) => {
  const item = await ProcessEntry.findByIdAndUpdate(req.params.id, { approvalStatus: 'REJECTED', rejectionReason: req.body.reason || 'Deleted/cancelled' }, { new: true });
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('UPDATED', req.lang), item);
});

exports.summary = asyncHandler(async (req, res) => {
  const data = await ProcessEntry.aggregate([{ $match: buildFilter(req) }, { $group: { _id: '$processCode', quantityIn: { $sum: '$quantityIn' }, quantityOut: { $sum: '$quantityOut' }, wastageQuantity: { $sum: '$wastageQuantity' }, entries: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  return success(res, t('FETCHED', req.lang), data);
});

exports.worker = asyncHandler(async (req, res) => {
  const f = buildFilter(req); f['workerContributions.workerId'] = req.params.workerId;
  const result = await paginate(ProcessEntry, f, req.query);
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.chamber = asyncHandler(async (req, res) => {
  const f = buildFilter(req); f.chamberId = req.params.chamberId;
  const result = await paginate(ProcessEntry, f, req.query);
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.approve = asyncHandler(async (req, res) => {
  const item = await ProcessEntry.findByIdAndUpdate(req.params.id, { approvalStatus: 'APPROVED', approvedBy: req.user._id, approvedAt: new Date() }, { new: true });
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('UPDATED', req.lang), item);
});

exports.reject = asyncHandler(async (req, res) => {
  const item = await ProcessEntry.findByIdAndUpdate(req.params.id, { approvalStatus: 'REJECTED', approvedBy: req.user._id, approvedAt: new Date(), rejectionReason: req.body.rejectionReason }, { new: true });
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('UPDATED', req.lang), item);
});

exports.voiceRemark = asyncHandler(async (req, res) => {
  const item = await ProcessEntry.findById(req.params.id);
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (!req.file) return fail(res, 'voiceNote file is required', 400);
  const voice = await VoiceRemark.create({ uploadedBy: req.user._id, relatedModule: 'PROCESS_ENTRY', relatedId: item._id, fileUrl: buildPublicFileUrl(req.file.filename), fileName: req.file.filename, mimeType: req.file.mimetype, sizeInBytes: req.file.size });
  item.voiceRemarkId = voice._id;
  await item.save();
  return created(res, t('CREATED', req.lang), voice);
});
