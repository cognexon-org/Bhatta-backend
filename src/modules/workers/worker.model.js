const mongoose = require('mongoose');
const { SALARY_TYPE } = require('../../constants/enums');

const workerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, trim: true },
  alternateMobile: String,
  aadhaarNo: { type: String, trim: true, sparse: true },
  address: String,
  village: String,

  // Final ERP design: WorkerCategory collection is source of truth.
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerCategory', required: true },
  categoryCode: { type: String, required: true, uppercase: true, trim: true },
  categoryName: String,
  categoryNameHindi: String,

  // Kept only for old clients that may still send/read category as text.
  category: String,

  teamName: String,
  jodiName: String,
  salaryType: { type: String, enum: SALARY_TYPE, default: 'DAILY' },
  dailyWage: { type: Number, default: 0 },
  monthlySalary: { type: Number, default: 0 },
  pieceRate: { type: Number, default: 0 },
  openingAdvance: { type: Number, default: 0 },
  currentBalance: { type: Number, default: 0 },
  joiningDate: { type: Date, default: Date.now },
  assignedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

workerSchema.index({ kilnId: 1, assignedManagerId: 1, categoryCode: 1 });
workerSchema.index({ categoryId: 1 });
workerSchema.index({ name: 'text', mobile: 'text' });

module.exports = mongoose.model('Worker', workerSchema);
