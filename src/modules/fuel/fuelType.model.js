const mongoose = require('mongoose');
const { FUEL_UNIT } = require('../../constants/enums');
const fuelTypeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  nameHindi: String,
  unit: { type: String, enum: FUEL_UNIT, default: 'KG' },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('FuelType', fuelTypeSchema);
