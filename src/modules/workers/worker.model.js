const mongoose = require('mongoose');
const { SALARY_TYPE } = require('../../constants/enums');
const workerCategories = require('../../constants/workerCategories');
const workerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true }, mobile: { type: String, trim: true }, address: String, category: String,
  categoryCode: { type: String, enum: workerCategories.map((c) => c.code), required: true },
  salaryType: { type: String, enum: SALARY_TYPE, default: 'DAILY' }, dailyWage: { type: Number, default: 0 }, monthlySalary: { type: Number, default: 0 }, pieceRate: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now }, assignedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  isActive: { type: Boolean, default: true }, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
workerSchema.index({ categoryCode: 1, assignedManagerId: 1 });
workerSchema.index({ name: 'text', mobile: 'text' });
module.exports = mongoose.model('Worker', workerSchema);
