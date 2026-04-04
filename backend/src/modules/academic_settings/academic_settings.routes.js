const router = require('express').Router();
const controller = require('./academic_settings.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);
router.get('/', requireRole('admin', 'registrar', 'dean', 'cashier'), controller.list);
router.get('/active', requireRole('admin', 'staff', 'registrar', 'dean', 'cashier', 'teacher', 'student'), controller.getActive);
router.post('/', requireRole('admin'), controller.create);
router.patch('/:id/activate', requireRole('admin'), controller.setActive);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
