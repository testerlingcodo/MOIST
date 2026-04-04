const router = require('express').Router();
const controller = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

// Webhooks are public (verified internally by signature/token)
router.post('/webhook', controller.webhook);
router.post('/xendit-webhook', controller.xenditWebhook);

router.use(authenticate);

// Cashier processes payments & tracks balances; student views own payments
router.get('/', requireRole('admin', 'cashier', 'registrar', 'staff'), controller.list);
router.post('/create-link', requireRole('admin', 'cashier', 'student'), controller.createLink);
router.post('/cash', requireRole('admin', 'cashier'), controller.recordCash);
router.post('/installment', requireRole('admin', 'cashier'), controller.recordInstallment);
router.post('/online', requireRole('student'), controller.submitOnline);
router.post('/xendit-create', requireRole('student'), controller.xenditCreate);
router.patch('/:id/xendit-cancel', requireRole('student'), controller.cancelXendit);

// Batch payments — must come BEFORE /:id to avoid being captured by the param handler
router.get('/batch/:batchId', requireRole('admin', 'cashier', 'registrar', 'staff', 'student'), controller.listByBatch);

router.get('/:id', requireRole('admin', 'cashier', 'registrar', 'staff', 'student'), controller.getById);
router.patch('/:id/refund', requireRole('admin'), controller.refund);
router.patch('/:id/verify', requireRole('admin', 'cashier'), controller.verify);
router.patch('/:id/reject', requireRole('admin', 'cashier'), controller.reject);

module.exports = router;
