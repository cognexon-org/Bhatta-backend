const mongoose = require('mongoose');
const { APPROVAL_STATUS } = require('../../constants/enums');

const workerContributionSchema = new mongoose.Schema({
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkerCategory' },
  categoryCode: { type: String, uppercase: true, trim: true },
  categoryName: String,
  categoryNameHindi: String,
  quantity: { type: Number, default: 0, min: 0 },
  unit: String,
  rate: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
  remark: String
}, { _id: false });

const outputSchema = new mongoose.Schema({
  stockCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  categoryCode: { type: String, uppercase: true, trim: true },
  categoryName: String,
  categoryNameHindi: String,
  quantity: { type: Number, required: true, min: 0 }
}, { _id: false });

const fuelInputSchema = new mongoose.Schema({
  fuelTypeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FuelType' },
  fuelCode: { type: String, uppercase: true, trim: true },
  quantity: { type: Number, required: true, min: 0 },
  estimatedCost: { type: Number, default: 0, min: 0 }
}, { _id: false });

const processEntrySchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln', required: true },
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, default: Date.now },

  processId: { type: mongoose.Schema.Types.ObjectId, ref: 'Process' },
  processCode: { type: String, required: true, uppercase: true, trim: true },
  processName: String,
  processNameHindi: String,

  fromStockCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  fromCategoryCode: { type: String, uppercase: true, trim: true },
  toStockCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'StockCategory' },
  toCategoryCode: { type: String, uppercase: true, trim: true },
  quantityIn: { type: Number, default: 0, min: 0 },
  quantityOut: { type: Number, default: 0, min: 0 },
  wastageQuantity: { type: Number, default: 0, min: 0 },
  chamberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamber' },
  outputs: [outputSchema],
  workerContributions: [workerContributionSchema],
  fuelConsumptions: [fuelInputSchema],
  fuelConsumptionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'FuelConsumption' }],
  approvalStatus: { type: String, enum: APPROVAL_STATUS, default: 'NOT_REQUIRED' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  rejectionReason: String,
  textRemark: String,
  voiceRemarkId: { type: mongoose.Schema.Types.ObjectId, ref: 'VoiceRemark' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

processEntrySchema.index({ kilnId: 1, seasonId: 1, date: -1 });
processEntrySchema.index({ processCode: 1, date: -1 });
processEntrySchema.index({ processId: 1, date: -1 });
processEntrySchema.index({ chamberId: 1, date: -1 });
processEntrySchema.index({ 'workerContributions.workerId': 1 });

module.exports = mongoose.model('ProcessEntry', processEntrySchema);
