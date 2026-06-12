const mongoose = require('mongoose');

const expenseCategorySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  nameHindi: String,
  requiresApproval: { type: Boolean, default: false },
  approvalLimitAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('ExpenseCategory', expenseCategorySchema);
