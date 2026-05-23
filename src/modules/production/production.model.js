const mongoose = require('mongoose');
const { PRODUCTION_TYPE } = require('../../constants/enums');
const productionSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' }, managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, date: { type: Date, required: true },
  productionType: { type: String, enum: PRODUCTION_TYPE, required: true }, quantity: { type: Number, required: true, min: 0 },
  workerContributions: [{ workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' }, categoryCode: String, quantity: { type: Number, default: 0 }, remark: String }],
  textRemark: String, voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' }
}, { timestamps: true });
productionSchema.index({ date: 1, productionType: 1 });
productionSchema.index({ managerId: 1, date: 1 });
module.exports = mongoose.model('Production', productionSchema);
