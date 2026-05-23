const VoiceRemark = require('./voiceRemark.model');
const asyncHandler = require('../../utils/asyncHandler');
const { success, created, fail } = require('../../utils/apiResponse');
const { paginate } = require('../../utils/paginate');
const { buildPublicFileUrl } = require('../../config/storage');
const { t } = require('../../constants/messages');
exports.upload = asyncHandler(async (req, res) => { if (!req.file) return fail(res, 'voiceNote file is required', 400); const voice = await VoiceRemark.create({ uploadedBy: req.user._id, relatedModule: req.body.relatedModule, relatedId: req.body.relatedId, fileUrl: buildPublicFileUrl(req.file.filename), fileName: req.file.filename, mimeType: req.file.mimetype, durationInSeconds: req.body.durationInSeconds, sizeInBytes: req.file.size }); return created(res, t('CREATED', req.lang), voice); });
exports.list = asyncHandler(async (req, res) => { const filter = {}; if (req.query.relatedModule) filter.relatedModule = req.query.relatedModule; if (req.query.relatedId) filter.relatedId = req.query.relatedId; const result = await paginate(VoiceRemark, filter, req.query, { populate: [{ path: 'uploadedBy', select: 'name mobile role' }] }); return success(res, t('FETCHED', req.lang), result.items, 200, result.meta); });
exports.get = asyncHandler(async (req, res) => { const voice = await VoiceRemark.findById(req.params.id).populate('uploadedBy', 'name mobile role'); if (!voice) return fail(res, t('NOT_FOUND', req.lang), 404); return success(res, t('FETCHED', req.lang), voice); });
