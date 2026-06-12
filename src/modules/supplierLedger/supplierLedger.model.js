const mongoose = require('mongoose');
const { SUPPLIER_LEDGER_TYPE } = require('../../constants/enums');
const supplierLedgerSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  date: { type: Date, default: Date.now },
  transactionType: { type: String, enum: SUPPLIER_LEDGER_TYPE, required: true },
  sourceModule: String,
  sourceId: mongoose.Schema.Types.ObjectId,
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  balanceAfter: { type: Number, default: 0 },
  remark: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
supplierLedgerSchema.index({ supplierId: 1, date: -1 });
module.exports = mongoose.model('SupplierLedger', supplierLedgerSchema);
