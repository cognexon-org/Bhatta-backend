const mongoose = require('mongoose');
const { CUSTOMER_LEDGER_TYPE } = require('../../constants/enums');
const customerLedgerSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  date: { type: Date, default: Date.now },
  transactionType: { type: String, enum: CUSTOMER_LEDGER_TYPE, required: true },
  sourceModule: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  remark: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
customerLedgerSchema.index({ customerId: 1, date: -1 });
customerLedgerSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
module.exports = mongoose.model('CustomerLedger', customerLedgerSchema);
