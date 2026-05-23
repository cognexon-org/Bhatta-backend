const mongoose = require('mongoose');
const activityLogSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, role: String, action: String, module: String, moduleId: mongoose.Schema.Types.ObjectId, description: String, oldData: mongoose.Schema.Types.Mixed, newData: mongoose.Schema.Types.Mixed, ipAddress: String, userAgent: String }, { timestamps: { createdAt: true, updatedAt: false } });
activityLogSchema.index({ createdAt: -1 });
module.exports = mongoose.model('ActivityLog', activityLogSchema);
