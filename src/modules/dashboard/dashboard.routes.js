const router = require('express').Router();
const controller = require('./dashboard.controller');
const { protect } = require('../../middlewares/authMiddleware');
const { permit } = require('../../middlewares/roleMiddleware');
const roles = require('../../constants/roles');
router.use(protect);
router.get('/admin', permit(roles.ADMIN), controller.adminDashboard);
router.get('/manager', permit(roles.ADMIN, roles.MANAGER), controller.managerDashboard);
module.exports = router;
