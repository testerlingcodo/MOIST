const router = require('express').Router();
const controller = require('./enrollments.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

// Registrar handles enrollment; Dean monitors/approves student loads
router.get('/', requireRole('admin', 'staff', 'registrar', 'dean'), controller.list);
router.post('/', requireRole('admin', 'staff', 'registrar'), controller.create);
router.get('/:id', requireRole('admin', 'staff', 'registrar', 'dean'), controller.getById);
router.patch('/:id', requireRole('admin', 'staff', 'registrar'), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
