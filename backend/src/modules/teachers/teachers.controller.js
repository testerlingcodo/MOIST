const service = require('./teachers.service');

async function list(req, res, next) {
  try {
    const { page, limit, search, assigned_course, assigned_year_level, is_active } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      search,
      assigned_course,
      assigned_year_level: assigned_year_level ? parseInt(assigned_year_level) : undefined,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
    }));
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    res.json(await service.getById(req.params.id));
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    res.json(await service.getByUserId(req.user.sub));
  } catch (err) {
    next(err);
  }
}

async function getMyWorkload(req, res, next) {
  try {
    res.json(await service.getMyWorkload(req.user.sub));
  } catch (err) {
    next(err);
  }
}

async function getMyStudents(req, res, next) {
  try {
    res.json(await service.getMyStudents(req.user.sub));
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    res.status(201).json(await service.create(req.body));
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    res.json(await service.update(req.params.id, req.body));
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

async function assignLoad(req, res, next) {
  try {
    res.json(await service.assignLoad(req.params.id, req.body.subject_id));
  } catch (err) { next(err); }
}

async function removeLoad(req, res, next) {
  try {
    res.json(await service.removeLoad(req.params.id, req.params.subjectId));
  } catch (err) { next(err); }
}

module.exports = { list, getById, getMe, getMyWorkload, getMyStudents, create, update, remove, assignLoad, removeLoad };
