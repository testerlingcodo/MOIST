const router = require('express').Router();
const controller = require('./announcements.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);
router.get('/', controller.list);
router.post('/', requireRole('admin'), controller.create);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
