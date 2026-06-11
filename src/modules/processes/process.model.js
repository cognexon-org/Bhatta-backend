const mongoose = require('mongoose');

const processSchema = new mongoose.Schema({
  // Final ERP design: Process collection is source of truth. Constants are seed data only.
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  nameHindi: String,
  sequenceNo: { type: Number, default: 0 },
  inputCategoryCodes: [{ type: String, uppercase: true, trim: true }],
  outputCategoryCodes: [{ type: String, uppercase: true, trim: true }],
  requiresChamber: { type: Boolean, default: false },
  requiresWorkers: { type: Boolean, default: false },
  requiresFuel: { type: Boolean, default: false },
  affectsStock: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('Process', processSchema);
