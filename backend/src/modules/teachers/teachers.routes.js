const router = require('express').Router();
const controller = require('./teachers.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/me', requireRole('teacher'), controller.getMe);
router.get('/me/workload', requireRole('teacher'), controller.getMyWorkload);
router.get('/me/students', requireRole('teacher'), controller.getMyStudents);
// Dean monitors faculty; Registrar does sectioning/class assignment
router.get('/', requireRole('admin', 'staff', 'dean', 'registrar'), controller.list);
router.get('/:id', requireRole('admin', 'staff', 'dean', 'registrar'), controller.getById);
router.post('/', requireRole('admin', 'registrar'), controller.create);
router.patch('/:id', requireRole('admin', 'registrar'), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);
router.post('/:id/teaching-load', requireRole('admin', 'registrar', 'dean'), controller.assignLoad);
router.delete('/:id/teaching-load/:subjectId', requireRole('admin', 'registrar', 'dean'), controller.removeLoad);

module.exports = router;
