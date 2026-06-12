const mongoose = require('mongoose');
const fuelPurchaseSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  fuelTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelType', required: true },
  date: { type: Date, default: Date.now },
  quantity: { type: Number, required: true, min: 0 },
  unit: String,
  rate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  vehicleNumber: String,
  billNo: String,
  billImage: String,
  remark: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('FuelPurchase', fuelPurchaseSchema);
