const asyncHandler = require('../../utils/asyncHandler');
const { success } = require('../../utils/apiResponse');
const { parseVoiceEntry, SUPPORTED_TASKS } = require('./voiceEntry.service');

exports.parse = asyncHandler(async (req, res) => {
  const result = await parseVoiceEntry(req);
  return success(res, 'Voice entry parsed. Review before saving.', result);
});

exports.capabilities = asyncHandler(async (req, res) => success(res, 'Voice capabilities fetched', {
  enabled: req.tenant.features?.voiceEntry !== false && req.tenant.voice?.enabled !== false,
  defaultLanguage: req.tenant.voice?.defaultLanguage || 'hi-IN',
  supportedLanguages: req.tenant.voice?.supportedLanguages || ['hi-IN','en-IN'],
  tasks: SUPPORTED_TASKS,
  provider: req.tenant.ai?.provider || 'auto',
  deterministicFirst: req.tenant.voice?.deterministicFirst !== false
}));
