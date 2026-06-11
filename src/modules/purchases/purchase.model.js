const mongoose = require('mongoose');
const { PAYMENT_MODE } = require('../../constants/enums');
const purchaseSchema = new mongoose.Schema({
  purchaseNo: { type: String, unique: true, sparse: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  date: { type: Date, default: Date.now },
  itemName: { type: String, required: true },
  itemCategory: String,
  quantity: { type: Number, default: 0 },
  unit: String,
  rate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  paymentMode: { type: String, enum: PAYMENT_MODE, default: 'CASH' },
  billNo: String,
  billImage: String,
  remark: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
purchaseSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
module.exports = mongoose.model('Purchase', purchaseSchema);
