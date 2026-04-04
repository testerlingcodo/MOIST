const router = require('express').Router();
const controller = require('./courses.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.get('/', controller.list); // public — course list needed for registration
router.use(authenticate);
router.post('/',       requireRole('admin'), controller.create);
router.patch('/:id',   requireRole('admin'), controller.update);
router.delete('/:id',  requireRole('admin'), controller.remove);

module.exports = router;
