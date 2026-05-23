const router = require('express').Router();
const controller = require('./constants.controller');
router.get('/', controller.getConstants);
module.exports = router;
