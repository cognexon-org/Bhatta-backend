const mongoose = require('mongoose');
const { NOTIFICATION_TYPE } = require('../../constants/enums');
const notificationSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, title: { type: String, required: true }, message: { type: String, required: true }, type: { type: String, enum: NOTIFICATION_TYPE, default: 'GENERAL' }, relatedModule: String, relatedId: mongoose.Schema.Types.ObjectId, isRead: { type: Boolean, default: false }, sentVia: [{ type: String, enum: ['APP', 'SMS'] }] }, { timestamps: true });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
