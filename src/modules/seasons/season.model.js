const mongoose = require('mongoose');
const { SEASON_STATUS } = require('../../constants/enums');
const seasonSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  name: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  openingStockDate: Date,
  status: { type: String, enum: SEASON_STATUS, default: 'UPCOMING' },
  isDefault: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
seasonSchema.index({ kilnId: 1, status: 1 });
module.exports = mongoose.model('Season', seasonSchema);
