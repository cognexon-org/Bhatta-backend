const mongoose = require('mongoose');
const customerSchema = new mongoose.Schema({
  kilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  assignedManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true, trim: true },
  mobile: { type: String, trim: true },
  alternateMobile: String,
  villageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Village' },
  beatName: String,
  address: String,
  customerType: { type: String, enum: ['REGULAR', 'NEW', 'LEAD', 'RETAIL', 'WHOLESALE', 'DEALER', 'CONTRACTOR', 'OTHER'], default: 'NEW' },
  gstNo: String,
  openingBalance: { type: Number, default: 0 },
  creditLimit: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  totalPurchased: { type: Number, default: 0 },
  totalUdhari: { type: Number, default: 0 },
  totalPaid: { type: Number, default: 0 },
  outstandingAmount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });
customerSchema.index({ name: 'text', mobile: 'text', beatName: 'text' });
module.exports = mongoose.model('Customer', customerSchema);
