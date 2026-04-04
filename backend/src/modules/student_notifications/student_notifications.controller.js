const service = require('./student_notifications.service');

const getStudentId = (req) => req.user.studentId || req.user.student_id;

const list = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No student record' });
    res.json(await service.listForStudent(studentId));
  } catch (e) { next(e); }
};

const count = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No student record' });
    res.json({ count: await service.unreadCount(studentId) });
  } catch (e) { next(e); }
};

const markRead = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No student record' });
    await service.markRead(req.params.id, studentId);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

const markAllRead = async (req, res, next) => {
  try {
    const studentId = getStudentId(req);
    if (!studentId) return res.status(403).json({ error: 'No student record' });
    await service.markAllRead(studentId);
    res.json({ ok: true });
  } catch (e) { next(e); }
};

module.exports = { list, count, markRead, markAllRead };
