const router = require('express').Router();
const { body } = require('express-validator');
const controller = require('./user.controller');
const { protect } = require('../../middlewares/authMiddleware');
const { permit } = require('../../middlewares/roleMiddleware');
const validate = require('../../middlewares/validateRequest');
const roles = require('../../constants/roles');

router.use(protect);
router.get('/', permit(roles.ADMIN), controller.listUsers);
router.get('/:id', permit(roles.ADMIN), controller.getUser);
router.post('/managers', permit(roles.ADMIN), [body('name').notEmpty(), body('mobile').notEmpty(), body('password').isLength({ min: 6 })], validate, controller.createManager);
router.post('/admins', permit(roles.ADMIN), [body('name').notEmpty(), body('mobile').notEmpty(), body('password').isLength({ min: 6 })], validate, controller.createAdmin);
router.patch('/:id', permit(roles.ADMIN), controller.updateUser);
router.patch('/:id/deactivate', permit(roles.ADMIN), controller.deactivateUser);
module.exports = router;
