const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const roles = require('../../constants/roles');
const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  mobile: { type: String, required: true, unique: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: Object.values(roles), required: true },
  languagePreference: { type: String, enum: ['hi', 'en'], default: 'en' },
  assignedKilnId: { type: mongoose.Schema.Types.ObjectId, ref: 'Kiln' },
  assignedVillages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Village' }],
  isActive: { type: Boolean, default: true },
  fcmToken: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
userSchema.methods.comparePassword = function comparePassword(password) { return bcrypt.compare(password, this.passwordHash); };
userSchema.statics.hashPassword = function hashPassword(password) { return bcrypt.hash(password, 12); };
module.exports = mongoose.model('User', userSchema);
