const mongoose = require('mongoose');
const { VOICE_RELATED_MODULE } = require('../../constants/enums');
const voiceRemarkSchema = new mongoose.Schema({ uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, relatedModule: { type: String, enum: VOICE_RELATED_MODULE, required: true }, relatedId: { type: mongoose.Schema.Types.ObjectId, required: true }, fileUrl: { type: String, required: true }, fileName: String, mimeType: String, durationInSeconds: Number, sizeInBytes: Number }, { timestamps: { createdAt: true, updatedAt: false } });
voiceRemarkSchema.index({ relatedModule: 1, relatedId: 1 });
module.exports = mongoose.model('VoiceRemark', voiceRemarkSchema);
