const mongoose = require('mongoose');
const { WORKER_LEDGER_TYPE, PAYMENT_MODE } = require('../../constants/enums');
const workerLedgerSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  date: { type: Date, default: Date.now },
  transactionType: { type: String, enum: WORKER_LEDGER_TYPE, required: true },
  sourceModule: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  processCode: String,
  quantity: { type: Number, default: 0 },
  unit: String,
  rate: { type: Number, default: 0 },
  amount: { type: Number, required: true, min: 0 },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  paymentMode: { type: String, enum: PAYMENT_MODE },
  referenceNo: String,
  remark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
workerLedgerSchema.index({ workerId: 1, date: -1 });
workerLedgerSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
module.exports = mongoose.model('WorkerLedger', workerLedgerSchema);
