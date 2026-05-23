const mongoose = require('mongoose');
const { LEAD_STATUS } = require('../../constants/enums');
const leadSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, mobile: { type: String, trim: true }, villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' }, beatName: String, requirement: String, expectedQuantity: Number, expectedOrderDate: Date, followUpDate: Date, followUpStatus: { type: String, enum: LEAD_STATUS, default: 'PENDING' }, assignedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, notes: String, voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' } }, { timestamps: true });
leadSchema.index({ followUpDate: 1, followUpStatus: 1 });
module.exports = mongoose.model('Lead', leadSchema);
