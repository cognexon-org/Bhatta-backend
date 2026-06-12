const mongoose = require('mongoose');
const { SALARY_TYPE } = require('../../constants/enums');
const workerCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  nameHindi: String,
  defaultSalaryType: { type: String, enum: SALARY_TYPE, default: 'DAILY' },
  defaultRate: { type: Number, default: 0 },
  unit: { type: String, enum: ['DAY', 'MONTH', 'PER_1000', 'TRIP', 'HOUR'], default: 'DAY' },
  isProductionLinked: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('WorkerCategory', workerCategorySchema);
