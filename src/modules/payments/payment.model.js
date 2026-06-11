const mongoose = require('mongoose');
const { PAYMENT_MODE } = require('../../constants/enums');
const paymentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  udhariId: { type: mongoose.Schema.Types.ObjectId, ref: 'Udhari' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  amount: { type: Number, required: true, min: 0 },
  paymentMode: { type: String, enum: PAYMENT_MODE, default: 'CASH' },
  paymentDate: { type: Date, default: Date.now },
  receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  referenceNo: String,
  textRemark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' }
}, { timestamps: true });
paymentSchema.index({ customerId: 1, paymentDate: -1 });
module.exports = mongoose.model('Payment', paymentSchema);
