const mongoose = require('mongoose');
const { PAYMENT_MODE, APPROVAL_STATUS } = require('../../constants/enums');

const expenseSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExpenseCategory' },
  categoryCode: { type: String, required: true, uppercase: true, trim: true },
  categoryName: String,
  categoryNameHindi: String,
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: PAYMENT_MODE, default: 'CASH' },
  paidTo: String,
  description: String,
  billImage: String,
  approvalStatus: { type: String, enum: APPROVAL_STATUS, default: 'NOT_REQUIRED' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

expenseSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
expenseSchema.index({ categoryId: 1, categoryCode: 1 });
module.exports = mongoose.model('Expense', expenseSchema);
