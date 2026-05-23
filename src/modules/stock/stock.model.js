const mongoose = require('mongoose');
const stockSchema = new mongoose.Schema({ kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true }, categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory', required: true }, categoryCode: { type: String, required: true }, availableQuantity: { type: Number, default: 0 }, lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } }, { timestamps: true });
stockSchema.index({ kilnId: 1, categoryId: 1 }, { unique: true });
module.exports = mongoose.model('Stock', stockSchema);
