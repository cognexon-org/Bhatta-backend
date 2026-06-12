const Expense = require('./expense.model');
const CashTransaction = require('../cashbook/cashTransaction.model');
const roles = require('../../constants/roles');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
const { resolveExpenseCategory } = require('../../utils/masterData');

function filter(req) {
  const f = {};
  ['kilnId', 'seasonId', 'managerId', 'categoryId', 'categoryCode', 'approvalStatus', 'paymentMode'].forEach((k) => { if (req.query[k]) f[k] = req.query[k]; });
  if (req.user.role === roles.MANAGER) f.managerId = req.user._id;
  if (req.query.fromDate || req.query.toDate) {
    f.date = {};
    if (req.query.fromDate) f.date.$gte = new Date(req.query.fromDate);
    if (req.query.toDate) { const d = new Date(req.query.toDate); d.setHours(23, 59, 59, 999); f.date.$lte = d; }
  }
  return f;
}

async function decorateExpense(req, existing = null) {
  const body = { ...req.body };
  const category = await resolveExpenseCategory({ categoryId: body.categoryId || existing?.categoryId, categoryCode: body.categoryCode || existing?.categoryCode });
  body.categoryId = category._id;
  body.categoryCode = category.code;
  body.categoryName = category.name;
  body.categoryNameHindi = category.nameHindi;
  if (!body.approvalStatus) {
    body.approvalStatus = category.requiresApproval && Number(body.amount || 0) >= Number(category.approvalLimitAmount || 0) ? 'PENDING' : 'NOT_REQUIRED';
  }
  return body;
}

async function createCashForExpense(expense, userId) {
  if (expense.approvalStatus === 'REJECTED' || expense.approvalStatus === 'PENDING') return;
  const exists = await CashTransaction.findOne({ sourceModule: 'EXPENSE', sourceId: expense._id });
  if (exists) return;
  await CashTransaction.create({
    kilnId: expense.kilnId,
    seasonId: expense.seasonId,
    date: expense.date,
    transactionType: 'EXPENSE',
    sourceModule: 'EXPENSE',
    sourceId: expense._id,
    amount: expense.amount,
    paymentMode: expense.paymentMode,
    accountType: expense.paymentMode === 'BANK_TRANSFER' || expense.paymentMode === 'CHEQUE' ? 'BANK' : expense.paymentMode === 'UPI' ? 'UPI' : 'CASH',
    paidTo: expense.paidTo,
    createdBy: userId,
    remark: expense.description
  });
}

exports.list = asyncHandler(async (req, res) => {
  const result = await paginate(Expense, filter(req), req.query, { populate: [{ path: 'categoryId' }, { path: 'managerId', select: 'name mobile' }, { path: 'approvedBy', select: 'name mobile' }] });
  return success(res, t('FETCHED', req.lang), result.items, 200, result.meta);
});

exports.create = asyncHandler(async (req, res) => {
  const decorated = await decorateExpense(req);
  const item = await Expense.create({ ...decorated, kilnId: decorated.kilnId || req.user.assignedKilnId, managerId: req.user.role === roles.MANAGER ? req.user._id : decorated.managerId, createdBy: req.user._id });
  await createCashForExpense(item, req.user._id);
  return created(res, t('CREATED', req.lang), item);
});

exports.get = asyncHandler(async (req, res) => {
  const item = await Expense.findById(req.params.id).populate('categoryId managerId approvedBy voiceRemarkId');
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('FETCHED', req.lang), item);
});

exports.update = asyncHandler(async (req, res) => {
  const existing = await Expense.findById(req.params.id);
  if (!existing) return fail(res, t('NOT_FOUND', req.lang), 404);
  const decorated = await decorateExpense(req, existing);
  Object.assign(existing, decorated);
  await existing.save();
  return success(res, t('UPDATED', req.lang), existing);
});

exports.approve = asyncHandler(async (req, res) => {
  const item = await Expense.findById(req.params.id);
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  item.approvalStatus = 'APPROVED';
  item.approvedBy = req.user._id;
  item.approvedAt = new Date();
  await item.save();
  await createCashForExpense(item, req.user._id);
  return success(res, t('UPDATED', req.lang), item);
});

exports.reject = asyncHandler(async (req, res) => {
  const item = await Expense.findByIdAndUpdate(req.params.id, { approvalStatus: 'REJECTED', approvedBy: req.user._id, approvedAt: new Date(), rejectionReason: req.body.rejectionReason }, { new: true });
  if (!item) return fail(res, t('NOT_FOUND', req.lang), 404);
  return success(res, t('UPDATED', req.lang), item);
});

exports.summary = asyncHandler(async (req, res) => {
  const data = await Expense.aggregate([{ $match: filter(req) }, { $group: { _id: '$categoryCode', amount: { $sum: '$amount' }, entries: { $sum: 1 } } }]);
  return success(res, t('FETCHED', req.lang), data);
});
