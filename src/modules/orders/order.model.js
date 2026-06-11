const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../../constants/enums');
const orderSchema = new mongoose.Schema({
  orderNo: { type: String, required: true, unique: true },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  items: [{ stockCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' }, categoryCode: String, quantity: { type: Number, required: true, min: 0 }, ratePerThousand: { type: Number, default: 0 }, amount: { type: Number, default: 0 }, dispatchedQuantity: { type: Number, default: 0 } }],
  totalQuantity: { type: Number, default: 0 },
  dispatchedQuantity: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  udhariAmount: { type: Number, default: 0 },
  orderStatus: { type: String, enum: ORDER_STATUS, default: 'PENDING' },
  expectedDeliveryDate: Date,
  deliveryDate: Date,
  deliveryAddress: String,
  vehicleNumber: String,
  driverName: String,
  driverMobile: String,
  textRemark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);
