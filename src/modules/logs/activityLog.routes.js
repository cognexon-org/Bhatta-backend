const router = require('express').Router();
const controller = require('./activityLog.controller');
const { protect } = require('../../middlewares/authMiddleware');
const { permit } = require('../../middlewares/roleMiddleware');
const roles = require('../../constants/roles');
router.use(protect, permit(roles.ADMIN));
router.get('/', controller.list);
module.exports = router;
