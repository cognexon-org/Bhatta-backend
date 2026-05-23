const User = require('./user.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { writeActivityLog } = require('../../utils/auditLogger');
const { t } = require('../../constants/messages');

function publicUser(user) { const obj = user.toObject ? user.toObject() : user; delete obj.passwordHash; return obj; }

exports.createManager = asyncHandler(async (req, res) => {
  const passwordHash = await User.hashPassword(req.body.password);
  const manager = await User.create({ ...req.body, passwordHash, role: roles.MANAGER, createdBy: req.user._id });
  await writeActivityLog({ req, action: 'CREATE_MANAGER', module: 'USER', moduleId: manager._id, description: 'Manager created', newData: publicUser(manager) });
  return created(res, t('CREATED', req.lang), publicUser(manager));
});

exports.createAdmin = asyncHandler(async (req, res) => {
  const passwordHash = await User.hashPassword(req.body.password);
  const admin = await User.create({ ...req.body, passwordHash, role: roles.ADMIN, createdBy: req.user._id });
  return created(res, t('CREATED', req.lang), publicUser(admin));
});

exports.listUsers = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
  if (req.query.search) filter.$or = [{ name: new RegExp(req.query.search, 'i') }, { mobile: new RegExp(req.query.search, 'i') }, { email: new RegExp(req.query.search, 'i') }];
  const { items, meta } = await paginate(User, filter, req.query, { populate: [{ path: 'assignedKilnId' }, { path: 'assignedVillages' }] });
  return success(res, t('FETCHED', req.lang), items.map(publicUser), 200, meta);
});

exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate('assignedKilnId assignedVillages');
  if (!user) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('FETCHED', req.lang), publicUser(user));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const forbidden = ['passwordHash', 'password', 'role'];
  forbidden.forEach((key) => delete req.body[key]);
  const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!user) return fail(res, t('NOT_FOUND', req.lang), 404);
  await writeActivityLog({ req, action: 'UPDATE_USER', module: 'USER', moduleId: user._id, description: 'User updated', newData: publicUser(user) });
  return success(res, t('UPDATED', req.lang), publicUser(user));
});

exports.deactivateUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!user) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('UPDATED', req.lang), publicUser(user));
});
