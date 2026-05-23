const Worker = require('./worker.model');
const Attendance = require('../attendance/attendance.model');
const Production = require('../production/production.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { monthRange } = require('../../utils/dateHelper');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');

function managerScope(req, filter = {}) { if (req.user.role === roles.MANAGER) filter.assignedManagerId = req.user._id; return filter; }
function calculateDaySalary(worker, status) {
  if (status === 'ABSENT') return 0;
  if (worker.salaryType === 'DAILY') return status === 'HALF_DAY' ? worker.dailyWage / 2 : worker.dailyWage;
  if (worker.salaryType === 'MONTHLY') return status === 'HALF_DAY' ? worker.monthlySalary / 60 : worker.monthlySalary / 30;
  return 0;
}
exports.calculateDaySalary = calculateDaySalary;

exports.createWorker = asyncHandler(async (req, res) => {
  const body = { ...req.body, createdBy: req.user._id };
  if (req.user.role === roles.MANAGER) { body.assignedManagerId = req.user._id; body.kilnId = req.user.assignedKilnId; }
  const worker = await Worker.create(body);
  await writeActivityLog({ req, action: 'CREATE_WORKER', module: 'WORKER', moduleId: worker._id, description: 'Worker created', newData: worker });
  return created(res, t('CREATED', req.lang), worker);
});

exports.listWorkers = asyncHandler(async (req, res) => {
  const filter = managerScope(req, {});
  ['categoryCode', 'assignedManagerId', 'kilnId'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { mobile: new RegExp(req.query.search, 'i') }];
  const result = await paginate(Worker, filter, req.query, { populate: [{ path: 'assignedManagerId', select: 'name mobile' }, { path: 'kilnId' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.getWorker = asyncHandler(async (req, res) => { const worker = await Worker.findById(req.params.id).populate('assignedManagerId kilnId'); if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404); if (req.user.role === roles.MANAGER && String(worker.assignedManagerId?._id || worker.assignedManagerId) !== String(req.user._id)) return fail(res, t('FORBIDDEN', req.lang), 403); return success(res, t('FETCHED', req.lang), worker); });
exports.updateWorker = asyncHandler(async (req, res) => { const filter = managerScope(req, { _id: req.params.id }); const worker = await Worker.findOneAndUpdate(filter, req.body, { new: true, runValidators: true }); if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404); await writeActivityLog({ req, action: 'UPDATE_WORKER', module: 'WORKER', moduleId: worker._id, description: 'Worker updated', newData: worker }); return success(res, t('UPDATED', req.lang), worker); });
exports.salarySummary = asyncHandler(async (req, res) => {
  const worker = await Worker.findById(req.params.id); if (!worker) return fail(res, t('NOT_FOUND', req.lang), 404);
  const { start, end } = monthRange(req.query.month || new Date().toISOString().slice(0, 7));
  const attendance = await Attendance.find({ workerId: worker._id, date: { $gte: start, $lte: end } });
  const production = await Production.aggregate([{ $unwind: '$workerContributions' }, { $match: { 'workerContributions.workerId': worker._id, date: { $gte: start, $lte: end } } }, { $group: { _id: null, quantity: { $sum: '$workerContributions.quantity' } } }]);
  const attendanceSalary = attendance.reduce((sum, a) => sum + (a.salaryAmountForDay || calculateDaySalary(worker, a.status)), 0);
  const pieceQuantity = production[0]?.quantity || 0;
  const pieceSalary = worker.salaryType === 'PIECE_RATE' ? pieceQuantity * worker.pieceRate : 0;
  return success(res, t('FETCHED', req.lang), { worker, month: req.query.month, attendanceCounts: attendance.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}), pieceQuantity, attendanceSalary, pieceSalary, totalSalary: attendanceSalary + pieceSalary });
});
