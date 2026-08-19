const router = require('express').Router();
const { protect } = require('../middlewares/authMiddleware');
const controller = require('./tenant.controller');
router.get('/config', protect, controller.current);
module.exports = router;
