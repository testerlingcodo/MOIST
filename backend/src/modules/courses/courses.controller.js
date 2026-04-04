const service = require('./courses.service');

const list   = async (req, res, next) => { try { res.json(await service.list()); } catch (e) { next(e); } };
const create = async (req, res, next) => { try { res.status(201).json(await service.create(req.body)); } catch (e) { next(e); } };
const update = async (req, res, next) => { try { res.json(await service.update(req.params.id, req.body)); } catch (e) { next(e); } };
const remove = async (req, res, next) => { try { await service.remove(req.params.id); res.json({ success: true }); } catch (e) { next(e); } };

module.exports = { list, create, update, remove };
