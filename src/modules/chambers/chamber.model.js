const mongoose = require('mongoose');
const { CHAMBER_STATUS } = require('../../constants/enums');
const chamberSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  chamberNo: { type: String, required: true },
  chamberName: String,
  capacity: { type: Number, default: 0 },
  currentQuantity: { type: Number, default: 0 },
  status: { type: String, enum: CHAMBER_STATUS, default: 'EMPTY' },
  lastProcessEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessEntry' },
  lastProcessDate: Date,
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
chamberSchema.index({ kilnId: 1, chamberNo: 1 }, { unique: true });
module.exports = mongoose.model('Chamber', chamberSchema);
