const mongoose = require('mongoose');
const { ATTENDANCE_STATUS } = require('../../constants/enums');
const workerCategories = require('../../constants/workerCategories');
const attendanceSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true }, managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  date: { type: Date, required: true }, status: { type: String, enum: ATTENDANCE_STATUS, required: true }, categoryCode: { type: String, enum: workerCategories.map((c) => c.code), required: true },
  checkInTime: Date, checkOutTime: Date, lateRemark: String, textRemark: String, voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' }, salaryAmountForDay: { type: Number, default: 0 }
}, { timestamps: true });
attendanceSchema.index({ workerId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1, categoryCode: 1 });
attendanceSchema.index({ managerId: 1, date: 1 });
module.exports = mongoose.model('Attendance', attendanceSchema);
