const router = require('express').Router();
const controller = require('./grades.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/', requireRole('admin', 'staff', 'teacher', 'dean', 'registrar'), controller.list);
router.post('/', requireRole('admin', 'staff', 'teacher'), controller.create);
router.get('/:id', requireRole('admin', 'staff', 'teacher', 'dean', 'registrar'), controller.getById);
router.patch('/:id', requireRole('admin', 'staff', 'teacher'), controller.update);
router.post('/:id/submit', requireRole('admin', 'staff', 'teacher'), controller.submit);
router.post('/:id/review', requireRole('admin', 'dean'), controller.review);
router.post('/batch-review', requireRole('admin', 'dean'), controller.reviewBatch);
router.post('/:id/verify', requireRole('admin', 'registrar'), controller.verify);
router.post('/batch-verify', requireRole('admin', 'registrar'), controller.verifyBatch);

module.exports = router;
