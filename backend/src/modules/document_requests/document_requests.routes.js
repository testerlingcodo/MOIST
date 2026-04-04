const router = require('express').Router();
const controller = require('./document_requests.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/types', controller.getTypes);
router.get('/mine', requireRole('student'), controller.listMine);
router.post('/', requireRole('student'), controller.create);
router.get('/', requireRole('admin', 'registrar'), controller.listAll);
router.patch('/:id/status', requireRole('admin', 'registrar'), controller.updateStatus);

module.exports = router;
