const service = require('./students.service');

async function list(req, res, next) {
  try {
    const { page, limit, search, course, status, year_level } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search, course, status,
      year_level: year_level ? parseInt(year_level) : undefined,
      teacher_user_id: req.user.role === 'teacher' ? req.user.sub : undefined,
    }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    // Students can only view their own record
    if (req.user.role === 'student' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'teacher' && !(await service.teacherCanAccessStudent(req.user.sub, req.params.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await service.getById(req.params.id));
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.create(req.body));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try {
    res.json(await service.update(req.params.id, req.body));
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

async function approve(req, res, next) {
  try {
    res.json(await service.approve(req.params.id));
  } catch (err) { next(err); }
}

async function reject(req, res, next) {
  try {
    res.json(await service.reject(req.params.id));
  } catch (err) { next(err); }
}

async function getGrades(req, res, next) {
  try {
    if (req.user.role === 'student' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'teacher' && !(await service.teacherCanAccessStudent(req.user.sub, req.params.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await service.getGrades(
      req.params.id,
      req.user.role === 'teacher' ? req.user.sub : undefined
    ));
  } catch (err) { next(err); }
}

async function getEnrollments(req, res, next) {
  try {
    if (req.user.role === 'student' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    if (req.user.role === 'teacher' && !(await service.teacherCanAccessStudent(req.user.sub, req.params.id))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await service.getEnrollments(
      req.params.id,
      req.user.role === 'teacher' ? req.user.sub : undefined
    ));
  } catch (err) { next(err); }
}

async function getPayments(req, res, next) {
  try {
    if (req.user.role === 'student' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await service.getPayments(req.params.id));
  } catch (err) { next(err); }
}

async function getProspectus(req, res, next) {
  try {
    if (req.user.role === 'student' && req.user.studentId !== req.params.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    res.json(await service.getProspectus(req.params.id));
  } catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove, approve, reject, getGrades, getEnrollments, getPayments, getProspectus };
