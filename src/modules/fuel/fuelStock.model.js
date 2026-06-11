const mongoose = require('mongoose');
const fuelStockSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  fuelTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelType', required: true },
  availableQuantity: { type: Number, default: 0 },
  averageRate: { type: Number, default: 0 },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
fuelStockSchema.index({ kilnId: 1, seasonId: 1, fuelTypeId: 1 }, { unique: true });
module.exports = mongoose.model('FuelStock', fuelStockSchema);
