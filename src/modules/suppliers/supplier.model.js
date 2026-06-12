const mongoose = require('mongoose');
const { SUPPLIER_TYPE } = require('../../constants/enums');
const supplierSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: String,
  supplierType: { type: String, enum: SUPPLIER_TYPE, default: 'OTHER' },
  address: String,
  gstNo: String,
  openingBalance: { type: Number, default: 0 },
  outstandingAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
supplierSchema.index({ name: 'text', mobile: 'text' });
module.exports = mongoose.model('Supplier', supplierSchema);
