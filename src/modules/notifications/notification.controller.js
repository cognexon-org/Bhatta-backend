const Notification = require('./notification.model');
const asyncHandler = require('../../utils/asyncHandler');
const { success, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { t } = require('../../constants/messages');
exports.list = asyncHandler(async (req, res) => { const filter = { userId: req.user._id }; if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === 'true'; const result = await paginate(Notification, filter, req.query); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.markRead = asyncHandler(async (req, res) => { const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user._id }, { isRead: true }, { new: true }); if (!item) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('UPDATED', req.lang), item); });
exports.markAllRead = asyncHandler(async (req, res) => { await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true }); return success(res, t('UPDATED', req.lang)); });
