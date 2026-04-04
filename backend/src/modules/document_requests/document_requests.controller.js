const service = require('./document_requests.service');

const getTypes = (req, res) => res.json(service.DOCUMENT_TYPES);

const listMine = async (req, res, next) => {
  try {
    const studentId = req.user.studentId || req.user.student_id;
    if (!studentId) return res.status(403).json({ error: 'No student record linked to your account' });
    res.json(await service.listForStudent(studentId));
  } catch (e) { next(e); }
};

const listAll = async (req, res, next) => {
  try {
    res.json(await service.listAll(req.query));
  } catch (e) { next(e); }
};

const create = async (req, res, next) => {
  try {
    const studentId = req.user.studentId || req.user.student_id;
    if (!studentId) return res.status(403).json({ error: 'No student record linked to your account' });
    const result = await service.create({ ...req.body, student_id: studentId });
    res.status(201).json(result);
  } catch (e) { next(e); }
};

const updateStatus = async (req, res, next) => {
  try {
    res.json(await service.updateStatus(req.params.id, req.body));
  } catch (e) { next(e); }
};

module.exports = { getTypes, listMine, listAll, create, updateStatus };
