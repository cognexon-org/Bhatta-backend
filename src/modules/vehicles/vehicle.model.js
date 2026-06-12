const mongoose = require('mongoose');
const { VEHICLE_TYPE } = require('../../constants/enums');
const vehicleSchema = new mongoose.Schema({
  vehicleNumber: { type: String, required: true, uppercase: true, trim: true },
  vehicleType: { type: String, enum: VEHICLE_TYPE, default: 'TRUCK' },
  ownerName: String,
  driverName: String,
  driverMobile: String,
  isOwnVehicle: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
vehicleSchema.index({ vehicleNumber: 1 }, { unique: true });
module.exports = mongoose.model('Vehicle', vehicleSchema);
