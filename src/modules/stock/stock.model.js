const mongoose = require('mongoose');
const stockSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory', required: true },
  categoryCode: { type: String, required: true },
  availableQuantity: { type: Number, default: 0 },
  reservedQuantity: { type: Number, default: 0 },
  damagedQuantity: { type: Number, default: 0 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
stockSchema.index({ kilnId: 1, seasonId: 1, categoryId: 1 }, { unique: true });
stockSchema.index({ kilnId: 1, categoryCode: 1 });
module.exports = mongoose.model('Stock', stockSchema);
