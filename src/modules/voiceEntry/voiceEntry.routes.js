const router = require('express').Router();
const { protect } = require('../../middlewares/authMiddleware');
const controller = require('./voiceEntry.controller');

router.use(protect);
router.get('/capabilities', controller.capabilities);
router.post('/parse', controller.parse);

module.exports = router;
