const mongoose = require('mongoose');
const { BRICK_CATEGORY_GROUP } = require('../../constants/enums');
const stockCategorySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  nameHindi: { type: String, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  categoryGroup: { type: String, enum: BRICK_CATEGORY_GROUP, default: 'FINISHED' },
  saleable: { type: Boolean, default: true },
  allowDispatch: { type: Boolean, default: true },
  description: String,
  sortOrder: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
module.exports = mongoose.model('StockCategory', stockCategorySchema);
