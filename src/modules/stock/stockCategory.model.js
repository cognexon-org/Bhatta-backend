const mongoose = require('mongoose');
const stockCategorySchema = new mongoose.Schema({ name: { type: String, required: true, trim: true }, nameHindi: String, code: { type: String, required: true, unique: true, uppercase: true, trim: true }, description: String, isActive: { type: Boolean, default: true } }, { timestamps: true });
module.exports = mongoose.model('StockCategory', stockCategorySchema);
