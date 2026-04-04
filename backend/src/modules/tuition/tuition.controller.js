const service = require('./tuition.service');

async function list(req, res, next) {
  try {
    const { page, limit, school_year, semester, course, year_level } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      school_year, semester, course, year_level,
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
