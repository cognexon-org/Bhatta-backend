const mongoose = require('mongoose');
const { DISPATCH_STATUS } = require('../../constants/enums');
const dispatchItemSchema = new mongoose.Schema({
  stockCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  categoryCode: String,
  categoryName: String,
  quantity: { type: Number, required: true, min: 0 },
  ratePerThousand: { type: Number, default: 0 },
  amount: { type: Number, default: 0 }
}, { _id: false });
const dispatchSchema = new mongoose.Schema({
  dispatchNo: { type: String, required: true, unique: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  dispatchDate: { type: Date, default: Date.now },
  items: [dispatchItemSchema],
  totalQuantity: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  vehicleNumber: String,
  driverName: String,
  driverMobile: String,
  loadingWorkerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }],
  challanNo: { type: String, unique: true, sparse: true },
  invoiceNo: String,
  deliveryStatus: { type: String, enum: DISPATCH_STATUS, default: 'LOADING' },
  textRemark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
dispatchSchema.index({ kilnId: 1, seasonId: 1, dispatchDate: -1 });
dispatchSchema.index({ orderId: 1 });
module.exports = mongoose.model('Dispatch', dispatchSchema);
