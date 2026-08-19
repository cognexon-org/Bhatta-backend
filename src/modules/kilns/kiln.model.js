const mongoose = require('mongoose');
const { tenantModel } = require('../../platform/tenantModel');
const kilnSchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, ownerName: String, address: String, district: String, state: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
module.exports = tenantModel('Kiln', kilnSchema);
