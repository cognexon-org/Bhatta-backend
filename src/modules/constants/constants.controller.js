const workerCategories = require('../../constants/workerCategories');
const enums = require('../../constants/enums');
const { messages } = require('../../constants/messages');
const { success } = require('../../utils/apiResponse');
exports.getConstants = (req, res) => success(res, 'Constants fetched', { workerCategories, enums, messages: messages[req.lang] });
