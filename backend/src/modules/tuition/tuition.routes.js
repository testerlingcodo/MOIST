const router = require('express').Router();
const controller = require('./tuition.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);
// Cashier sets tuition & fees; Admin/Staff configure
router.get('/', requireRole('admin', 'staff', 'cashier', 'registrar', 'dean'), controller.list);
router.post('/', requireRole('admin', 'staff', 'cashier'), controller.create);
router.get('/:id', requireRole('admin', 'staff', 'cashier'), controller.getById);
router.patch('/:id', requireRole('admin', 'staff', 'cashier'), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
