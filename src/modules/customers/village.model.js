const mongoose = require('mongoose');
const villageSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, nameHindi: String, beatName: String, district: String, state: String, assignedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, isActive: { type: Boolean, default: true } }, { timestamps: true });
villageSchema.index({ name: 'text', beatName: 'text' });
module.exports = mongoose.model('Village', villageSchema);
