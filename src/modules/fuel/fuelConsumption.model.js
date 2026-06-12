const mongoose = require('mongoose');
const fuelConsumptionSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  processEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessEntry' },
  chamberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamber' },
  fuelTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelType', required: true },
  date: { type: Date, default: Date.now },
  quantity: { type: Number, required: true, min: 0 },
  estimatedCost: { type: Number, default: 0 },
  consumedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  remark: String
}, { timestamps: true });
fuelConsumptionSchema.index({ kilnId: 1, seasonId: 1, date: -1 });
module.exports = mongoose.model('FuelConsumption', fuelConsumptionSchema);
