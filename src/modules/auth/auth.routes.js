const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./auth.controller');
const validate = require('../../middlewares/validateRequest');
const { protect } = require('../../middlewares/authMiddleware');

router.post('/login', [body('password').notEmpty(), body('mobile').optional(), body('email').optional()], validate, controller.login);
router.post('/register-admin', [body('name').notEmpty(), body('mobile').notEmpty(), body('password').isLength({ min: 6 })], validate, controller.registerAdmin);
router.get('/me', protect, controller.me);
router.patch('/fcm-token', protect, [body('fcmToken').notEmpty()], validate, controller.updateFcmToken);
router.patch('/change-password', protect, [body('oldPassword').notEmpty(), body('newPassword').isLength({ min: 6 })], validate, controller.changePassword);
module.exports = router;
