const Worker = require('./worker.model');
const Attendance = require('../attendance/attendance.model');
const Production = require('../production/production.model');
const WorkerLedger = require('../workerLedger/workerLedger.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { monthRange } = require('../../utils/dateHelper');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');
const { resolveWorkerCategory } = require('../../utils/masterData');

function managerScope(req, filter = {}) {
  if (req.user.role === roles.MANAGER) filter.assignedManagerId = req.user._id;
  return filter;
}

function calculateDaySalary(worker, status) {
  if (status === 'ABSENT') return 0;
  if (worker.salaryType === 'DAILY') return status === 'HALF_DAY' ? worker.dailyWage / 2 : worker.dailyWage;
  if (worker.salaryType === 'MONTHLY') return status === 'HALF_DAY' ? worker.monthlySalary / 60 : worker.monthlySalary / 30;
  return 0;
}
exports.calculateDaySalary = calculateDaySalary;

async function buildWorkerPayload(req, existing = null) {
  const body = { ...req.body };

  // Support old clients that sent category as text/code.
  if (!body.categoryCode && body.category) body.categoryCode = body.category;

  const shouldResolveCategory = body.categoryId || body.categoryCode || !existing;
  if (shouldResolveCategory) {
    const category = await resolveWorkerCategory({
      categoryId: body.categoryId || existing?.categoryId,
      categoryCode: body.categoryCode || existing?.categoryCode
    });
    body.categoryId = category._id;
    body.categoryCode = category.code;
    body.categoryName = category.name;
    body.categoryNameHindi = category.nameHindi;
    body.category = category.name; // legacy display field

    if (!body.salaryType) body.salaryType = category.defaultSalaryType;
    if (body.pieceRate === undefined && category.unit === 'PER_1000') body.pieceRate = category.defaultRate || 0;
    if (body.dailyWage === undefined && category.unit === 'DAY') body.dailyWage = category.defaultRate || 0;
  }

  if (req.user.role === roles.MANAGER) {
    body.assignedManagerId = req.user._id;
    body.kilnId = req.user.assignedKilnId;
  }
  if (!body.createdBy && !existing) body.createdBy = req.user._id;
  return body;
}

exports.createWorker = asyncHandler(async (req, res) => {
  const body = await buildWorkerPayload(req);
  const worker = await Worker.create(body);
  await writeActivityLog({ req, action: 'CREATE_WORKER', module: 'WORKER', moduleId: worker._id, description: 'Worker created', newData: worker });
  return created(res, t('CREATED', req.lang), worker);
});

exports.listWorkers = asyncHandler(async (req, res) => {
  const filter = managerScope(req, {});
  ['categoryCode', 'categoryId', 'assignedManagerId', 'kilnId', 'seasonId'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { mobile: new RegExp(req.query.search, 'i') }, { categoryCode: new RegExp(req.query.search, 'i') }];
  const result = await paginate(Worker, filter, req.query, { populate: [{ path: 'categoryId' }, { path: 'assignedManagerId', select: 'name mobile' }, { path: 'kilnId' }, { path: 'seasonId' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.getWorker = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id).populate('categoryId assignedManagerId kilnId seasonId');
  if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (req.user.role === roles.MANAGER && String(worker.assignedManagerId?._id || worker.assignedManagerId) !== String(req.user._id)) return fail(res, t('FORBIDDEN', req.lang), 403);
  return success(res, t('FETCHED', req.lang), worker);
});

exports.updateWorker = asyncHandler(async (req, res) => {
  const filter = managerScope(req, { _id: req.params.id });
  const existing = await Worker.findOne(filter);
  if (!existing) return fail(res, t('NOT_FOUND', req.lang), 404);
  const body = await buildWorkerPayload(req, existing);
  Object.assign(existing, body);
  await existing.save();
  await writeActivityLog({ req, action: 'UPDATE_WORKER', module: 'WORKER', moduleId: existing._id, description: 'Worker updated', newData: existing });
  return success(res, t('UPDATED', req.lang), existing);
});

exports.salarySummary = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id).populate('categoryId');
  if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (req.user.role === roles.MANAGER && String(worker.assignedManagerId || '') !== String(req.user._id)) return fail(res, t('FORBIDDEN', req.lang), 403);
  const { start, end } = monthRange(req.query.month || new Date().toISOString().slice(0, 7));
  const attendance = await Attendance.find({ workerId: worker._id, date: { $gte: start, $lte: end } });
  const legacyProduction = await Production.aggregate([{ $unwind: '$workerContributions' }, { $match: { 'workerContributions.workerId': worker._id, date: { $gte: start, $lte: end } } }, { $group: { _id: null, quantity: { $sum: '$workerContributions.quantity' } } }]);
  const ledger = await WorkerLedger.aggregate([{ $match: { workerId: worker._id, date: { $gte: start, $lte: end } } }, { $group: { _id: '$transactionType', amount: { $sum: '$amount' }, debit: { $sum: '$debit' }, credit: { $sum: '$credit' } } }]);
  const attendanceSalary = attendance.reduce((sum, a) => sum + (a.salaryAmountForDay || calculateDaySalary(worker, a.status)), 0);
  const pieceQuantity = legacyProduction[0]?.quantity || 0;
  const legacyPieceSalary = worker.salaryType === 'PIECE_RATE' ? (pieceQuantity / 1000) * worker.pieceRate : 0;
  const ledgerTotals = ledger.reduce((acc, row) => { acc[row._id] = row; return acc; }, {});
  return success(res, t('FETCHED', req.lang), {
    worker,
    month: req.query.month,
    attendanceCounts: attendance.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}),
    legacyPieceQuantity: pieceQuantity,
    attendanceSalary,
    legacyPieceSalary,
    ledgerTotals,
    currentBalance: worker.currentBalance,
    totalSalary: attendanceSalary + legacyPieceSalary
  });
});

exports.attendanceHistory = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id);
  if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (req.user.role === roles.MANAGER && String(worker.assignedManagerId || '') !== String(req.user._id)) return fail(res, t('FORBIDDEN', req.lang), 403);
  const filter = { workerId: worker._id };
  if (req.query.fromDate || req.query.toDate || req.query.from || req.query.to) {
    filter.date = {};
    const from = req.query.fromDate || req.query.from;
    const to = req.query.toDate || req.query.to;
    if (from) filter.date.$gte = new Date(from);
    if (to) { const d = new Date(to); d.setHours(23, 59, 59, 999); filter.date.$lte = d; }
  }
  const result = await paginate(Attendance, filter, req.query, { populate: [{ path: 'categoryId' }, { path: 'managerId', select: 'name mobile' }, { path: 'voiceRemarkId' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});
