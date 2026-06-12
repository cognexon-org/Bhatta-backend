const mongoose = require('mongoose');
const { STOCK_LEDGER_TYPE, APPROVAL_STATUS } = require('../../constants/enums');
const stockLedgerSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  date: { type: Date, default: Date.now },
  transactionType: { type: String, enum: STOCK_LEDGER_TYPE, required: true },
  fromCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  fromCategoryCode: String,
  toCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  toCategoryCode: String,
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  categoryCode: String,
  quantity: { type: Number, required: true, min: 0 },
  sourceModule: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  previousQuantity: { type: Number, default: 0 },
  newQuantity: { type: Number, default: 0 },
  approvalStatus: { type: String, enum: APPROVAL_STATUS, default: 'NOT_REQUIRED' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remark: String
}, { timestamps: true });
stockLedgerSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
stockLedgerSchema.index({ sourceModule: 1, sourceId: 1 });
stockLedgerSchema.index({ categoryCode: 1, date: -1 });
module.exports = mongoose.model('StockLedger', stockLedgerSchema);
