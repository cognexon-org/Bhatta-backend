const User = require('../users/user.model');
const roles = require('../../constants/roles');
const { signToken } = require('../../config/jwt');
const { success, created, fail } = require('../../utils/apiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { t } = require('../../constants/messages');
const { writeActivityLog } = require('../../utils/auditLogger');

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : user;
  delete obj.passwordHash;
  return obj;
}

exports.registerAdmin = asyncHandler(async (req, res) => {
  const existingAdmin = await User.findOne({ role: roles.ADMIN });
  if (existingAdmin && !req.user) return fail(res, 'Admin already exists. Use seed script or logged-in admin to create another admin.', 409);
  const passwordHash = await User.hashPassword(req.body.password);
  const admin = await User.create({ name: req.body.name, mobile: req.body.mobile, email: req.body.email, passwordHash, role: roles.ADMIN, languagePreference: req.body.languagePreference || 'en', createdBy: req.user?._id });
  await writeActivityLog({ req, action: 'CREATE_ADMIN', module: 'AUTH', moduleId: admin._id, description: 'Admin registered', newData: sanitizeUser(admin) });
  return created(res, t('CREATED', req.lang), sanitizeUser(admin));
});

exports.login = asyncHandler(async (req, res) => {
  const { mobile, email, password } = req.body;
  const user = await User.findOne({ $or: [{ mobile }, { email }] }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.comparePassword(password))) return fail(res, t('INVALID_CREDENTIALS', req.lang), 401);
  const token = signToken({ id: user._id, role: user.role });
  return success(res, t('LOGIN_SUCCESS', req.lang), { token, user: sanitizeUser(user) });
});

exports.me = asyncHandler(async (req, res) => success(res, t('FETCHED', req.lang), sanitizeUser(req.user)));

exports.updateFcmToken = asyncHandler(async (req, res) => {
  req.user.fcmToken = req.body.fcmToken;
  await req.user.save();
  return success(res, t('UPDATED', req.lang), sanitizeUser(req.user));
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await user.comparePassword(oldPassword))) return fail(res, 'Old password is incorrect', 400);
  user.passwordHash = await User.hashPassword(newPassword);
  await user.save();
  return success(res, t('UPDATED', req.lang));
});
