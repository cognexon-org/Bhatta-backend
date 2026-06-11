const mongoose = require('mongoose');
const { UDHARI_STATUS } = require('../../constants/enums');
const udhariSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  dispatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dispatch' },
  amount: { type: Number, required: true, min: 0 },
  pendingAmount: { type: Number, required: true, min: 0 },
  paidAmount: { type: Number, default: 0 },
  udhariDate: { type: Date, default: Date.now },
  dueDate: Date,
  reason: String,
  status: { type: String, enum: UDHARI_STATUS, default: 'PENDING' },
  reminderEnabled: { type: Boolean, default: true },
  reminderDaysBefore: { type: Number, default: 1 },
  textRemark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' }
}, { timestamps: true });
udhariSchema.index({ dueDate: 1, status: 1 });
udhariSchema.index({ customerId: 1, status: 1 });
module.exports = mongoose.model('Udhari', udhariSchema);
