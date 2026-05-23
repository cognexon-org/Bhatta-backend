const router = require('express').Router();
const controller = require('./notification.controller');
const { protect } = require('../../middlewares/authMiddleware');
router.use(protect);
router.get('/', controller.list);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);
module.exports = router;
