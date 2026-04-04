'use strict';

const service = require('./audit_logs.service');

async function list(req, res, next) {
  try {
    const { page, limit, entity, actor_id, action, search } = req.query;
    const result = await service.list({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
      entity,
      actor_id,
      action,
      search,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list };
