'use strict';

const service = require('./academic_settings.service');

async function list(req, res, next) {
  try {
    const data = await service.list();
    res.json({ data });
  } catch (err) { next(err); }
}

async function getActive(req, res, next) {
  try {
    const data = await service.getActive();
    res.json(data || {});
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const { school_year, semester, label } = req.body;
    const data = await service.create({ school_year, semester, label, created_by: req.user.sub });
    res.status(201).json(data);
  } catch (err) { next(err); }
}

async function setActive(req, res, next) {
  try {
    const data = await service.setActive(req.params.id);
    res.json(data);
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await service.remove(req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
}

module.exports = { list, getActive, create, setActive, remove };
