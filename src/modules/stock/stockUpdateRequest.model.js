const mongoose = require('mongoose');
const { STOCK_UPDATE_TYPE, APPROVAL_STATUS } = require('../../constants/enums');

const stockUpdateRequestSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory', required: true },
  categoryCode: { type: String, required: true, uppercase: true, trim: true },
  updateType: { type: String, enum: STOCK_UPDATE_TYPE, required: true },
  quantity: { type: Number, required: true, min: 0 },
  reason: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  status: { type: String, enum: APPROVAL_STATUS, default: 'PENDING' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String
}, { timestamps: true });

stockUpdateRequestSchema.index({ kilnId: 1, seasonId: 1, status: 1 });
stockUpdateRequestSchema.index({ managerId: 1, status: 1 });
module.exports = mongoose.model('StockUpdateRequest', stockUpdateRequestSchema);
