const Attendance = require('./attendance.model');
const Worker = require('../workers/worker.model');
const VoiceRemark = require('../voiceRemarks/voiceRemark.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { startOfDay, endOfDay } = require('../../utils/dateHelper');
const { calculateDaySalary } = require('../workers/worker.controller');
const { buildPublicFileUrl } = require('../../config/storage');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');

exports.markAttendance = asyncHandler(async (req, res) => {
  const date = startOfDay(req.body.date || new Date());
  const results = [];
  for (const entry of req.body.entries || []) {
    const worker = await Worker.findById(entry.workerId);
    if (!worker) continue;
    if (req.user.role === roles.MANAGER && String(worker.assignedManagerId) !== String(req.user._id)) continue;
    const payload = {
      workerId: worker._id,
      managerId: req.user.role === roles.MANAGER ? req.user._id : (entry.managerId || worker.assignedManagerId || req.user._id),
      kilnId: worker.kilnId || req.user.assignedKilnId,
      date,
      status: entry.status,
      categoryCode: worker.categoryCode,
      checkInTime: entry.checkInTime,
      checkOutTime: entry.checkOutTime,
      lateRemark: entry.lateRemark,
      textRemark: entry.textRemark,
      salaryAmountForDay: entry.salaryAmountForDay ?? calculateDaySalary(worker, entry.status)
    };
    const saved = await Attendance.findOneAndUpdate({ workerId: worker._id, date }, payload, { new: true, upsert: true, runValidators: true });
    results.push(saved);
  }
  await writeActivityLog({ req, action: 'MARK_ATTENDANCE', module: 'ATTENDANCE', description: `Marked ${results.length} attendance entries`, newData: { date, count: results.length } });
  return created(res, t('CREATED', req.lang), results);
});

exports.getDailyAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const filter = { date: { $gte: startOfDay(date), $lte: endOfDay(date) } };
  if (req.user.role === roles.MANAGER) filter.managerId = req.user._id;
  if (req.query.categoryCode) filter.categoryCode = req.query.categoryCode;
  const data = await Attendance.find(filter).populate('workerId managerId kilnId voiceRemarkId').sort({ categoryCode: 1 });
  return success(res, t('FETCHED', req.lang), data);
});

exports.categoryWiseAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date ? new Date(req.query.date) : new Date();
  const match = { date: { $gte: startOfDay(date), $lte: endOfDay(date) } };
  if (req.user.role === roles.MANAGER) match.managerId = req.user._id;
  const data = await Attendance.aggregate([{ $match: match }, { $group: { _id: { categoryCode: '$categoryCode', status: '$status' }, count: { $sum: 1 } } }, { $group: { _id: '$_id.categoryCode', statuses: { $push: { status: '$_id.status', count: '$count' } }, total: { $sum: '$count' } } }, { $sort: { _id: 1 } }]);
  return success(res, t('FETCHED', req.lang), data);
});

exports.history = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.workerId) filter.workerId = req.query.workerId;
  if (req.query.from || req.query.to) filter.date = { ...(req.query.from ? { $gte: startOfDay(req.query.from) } : {}), ...(req.query.to ? { $lte: endOfDay(req.query.to) } : {}) };
  if (req.user.role === roles.MANAGER) filter.managerId = req.user._id;
  const data = await Attendance.find(filter).populate('workerId managerId voiceRemarkId').sort({ date: -1 });
  return success(res, t('FETCHED', req.lang), data);
});

exports.uploadVoiceRemark = asyncHandler(async (req, res) => {
  const attendance = await Attendance.findById(req.params.attendanceId);
  if (!attendance) return fail(res, t('NOT_FOUND', req.lang), 404);
  if (!req.file) return fail(res, 'voiceNote file is required', 400);
  const voice = await VoiceRemark.create({ uploadedBy: req.user._id, relatedModule: 'ATTENDANCE', relatedId: attendance._id, fileUrl: buildPublicFileUrl(req.file.filename), fileName: req.file.filename, mimeType: req.file.mimetype, sizeInBytes: req.file.size });
  attendance.voiceRemarkId = voice._id;
  await attendance.save();
  return created(res, t('CREATED', req.lang), voice);
});
