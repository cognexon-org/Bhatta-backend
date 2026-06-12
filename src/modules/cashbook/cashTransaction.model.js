const mongoose = require('mongoose');
const { CASH_TRANSACTION_TYPE, PAYMENT_MODE, ACCOUNT_TYPE } = require('../../constants/enums');
const cashTransactionSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  date: { type: Date, default: Date.now },
  transactionType: { type: String, enum: CASH_TRANSACTION_TYPE, required: true },
  sourceModule: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: PAYMENT_MODE, default: 'CASH' },
  accountType: { type: String, enum: ACCOUNT_TYPE, default: 'CASH' },
  receivedFrom: String,
  paidTo: String,
  remark: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
cashTransactionSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
cashTransactionSchema.index({ sourceModule: 1, sourceId: 1 });
module.exports = mongoose.model('CashTransaction', cashTransactionSchema);
