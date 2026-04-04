const router = require('express').Router();
const controller = require('./students.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/', requireRole('admin', 'staff', 'cashier', 'teacher', 'dean', 'registrar'), controller.list);
router.post('/', requireRole('admin', 'registrar'), controller.create);
router.get('/:id', requireRole('admin', 'staff', 'cashier', 'teacher', 'dean', 'registrar', 'student'), controller.getById);
router.patch('/:id', requireRole('admin', 'registrar'), controller.update);
router.delete('/:id', requireRole('admin'), controller.remove);
router.patch('/:id/approve', requireRole('admin', 'registrar'), controller.approve);
router.patch('/:id/reject', requireRole('admin', 'registrar'), controller.reject);

router.get('/:id/grades', requireRole('admin', 'teacher', 'dean', 'registrar', 'student'), controller.getGrades);
router.get('/:id/enrollments', requireRole('admin', 'registrar', 'student'), controller.getEnrollments);
router.get('/:id/payments', requireRole('admin', 'registrar', 'cashier', 'student'), controller.getPayments);
router.get('/:id/prospectus', requireRole('admin', 'dean', 'registrar', 'student'), controller.getProspectus);

module.exports = router;
