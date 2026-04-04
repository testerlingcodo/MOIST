'use strict';
const service = require('./announcements.service');

async function list(req, res, next) {
  try {
    const { page, limit, category } = req.query;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      category,
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { title, body, category } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body are required' });
    const item = await service.create({ title, body, category, posted_by: req.user.sub });
    res.status(201).json(item);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, create, remove };
