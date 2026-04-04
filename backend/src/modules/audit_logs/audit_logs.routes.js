const router = require('express').Router();
const controller = require('./audit_logs.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);
router.get('/', requireRole('admin', 'registrar'), controller.list);

module.exports = router;
