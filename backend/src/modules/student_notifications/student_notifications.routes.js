const router = require('express').Router();
const controller = require('./student_notifications.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);
router.get('/', controller.list);
router.get('/unread-count', controller.count);
router.patch('/mark-all-read', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

module.exports = router;
