const service = require('./subjects.service');

async function list(req, res, next) {
  try {
    const { page, limit, search, is_active, is_open, course, year_level, semester, teacher_id } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
      is_active: is_active !== undefined ? is_active === 'true' : undefined,
      is_open: is_open !== undefined ? is_open === 'true' : undefined,
      course,
      year_level: year_level ? parseInt(year_level) : undefined,
      semester,
      teacher_id,
    }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try { res.json(await service.getById(req.params.id)); }
  catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await service.create(req.body)); }
  catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await service.update(req.params.id, req.body)); }
  catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { await service.remove(req.params.id); res.status(204).end(); }
  catch (err) { next(err); }
}

module.exports = { list, getById, create, update, remove };
