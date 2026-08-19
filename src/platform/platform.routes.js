const router = require('express').Router();
const platformAuth = require('./platformAuth.middleware');
const controller = require('./tenant.controller');

router.use(platformAuth);
router.get('/tenants', controller.list);
router.post('/tenants', controller.create);
router.patch('/tenants/:id', controller.update);
router.delete('/tenants/:id', controller.remove);

module.exports = router;
