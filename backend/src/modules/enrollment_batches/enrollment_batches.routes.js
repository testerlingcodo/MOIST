const router = require('express').Router();
const controller = require('./enrollment_batches.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/unenrolled', requireRole('admin', 'dean', 'registrar'), controller.listUnenrolled);
router.get('/courses', requireRole('admin', 'cashier', 'registrar', 'staff', 'dean'), controller.listCourses);
router.get('/assessments', requireRole('admin', 'cashier', 'registrar', 'staff', 'dean'), controller.listAssessments);
router.get('/pre-enrollment-subjects', requireRole('student'), controller.getPreEnrollmentSubjects);
router.get('/', requireRole('admin', 'staff', 'dean', 'registrar', 'cashier', 'student'), controller.list);
router.post('/', requireRole('admin', 'registrar', 'student'), controller.create);
router.get('/:id', requireRole('admin', 'staff', 'dean', 'registrar', 'cashier', 'student'), controller.getById);
router.patch('/:id/submit', requireRole('admin', 'registrar'), controller.submitForEvaluation);
router.get('/:id/available-subjects', requireRole('dean', 'admin', 'registrar'), controller.getAvailableSubjects);
router.get('/:id/creditable-subjects', requireRole('dean', 'admin', 'registrar'), controller.getCreditableSubjects);
router.patch('/:id/evaluate', requireRole('dean'), controller.evaluate);
router.patch('/:id/approve', requireRole('admin', 'staff'), controller.approve);
router.patch('/:id/register', requireRole('admin', 'registrar'), controller.register);
router.delete('/:id', requireRole('admin'), controller.remove);

module.exports = router;
