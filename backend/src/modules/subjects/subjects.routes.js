const router = require('express').Router();
const controller = require('./subjects.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);
// Admin, registrar, and dean can manage subjects; teacher views assigned
router.get('/', requireRole('admin', 'registrar', 'dean', 'teacher', 'student'), controller.list);
router.post('/', requireRole('admin', 'registrar'), controller.create);
router.get('/:id', requireRole('admin', 'registrar', 'dean', 'teacher', 'student'), controller.getById);
router.patch('/:id', requireRole('admin', 'registrar', 'dean'), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
