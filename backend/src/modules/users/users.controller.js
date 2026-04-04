const service = require('./users.service');

async function list(req, res, next) {
  try {
    const { page, limit, role, search } = req.query;
    const result = await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      role, search,
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
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

module.exports = { list, getById, create, update, remove };
