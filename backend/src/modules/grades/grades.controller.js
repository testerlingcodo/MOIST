const service = require('./grades.service');

async function list(req, res, next) {
  try {
    const { page, limit, school_year, semester, subject_id, submission_status, course, year_level } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      school_year,
      semester,
      subject_id,
      submission_status,
      course,
      year_level,
      teacher_user_id: req.user.role === 'teacher' ? req.user.sub : undefined,
    }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    res.json(await service.getById(
      req.params.id,
      req.user.role === 'teacher' ? req.user.sub : undefined
    ));
  }
  catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const data = { ...req.body, encoded_by: req.user.sub };
    res.status(201).json(await service.create(data, req.user));
  } catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await service.update(req.params.id, req.body, req.user)); }
  catch (err) { next(err); }
}

async function submit(req, res, next) {
  try {
    res.json(await service.submit(req.params.id, req.user));
  } catch (err) { next(err); }
}

async function review(req, res, next) {
  try { res.json(await service.review(req.params.id, req.user)); }
  catch (err) { next(err); }
}

async function reviewBatch(req, res, next) {
  try { res.json(await service.reviewBatch(req.body.ids, req.user)); }
  catch (err) { next(err); }
}

async function verify(req, res, next) {
  try { res.json(await service.verify(req.params.id, req.user)); }
  catch (err) { next(err); }
}

async function verifyBatch(req, res, next) {
  try { res.json(await service.verifyBatch(req.body.ids, req.user)); }
  catch (err) { next(err); }
}

module.exports = { list, getById, create, update, submit, review, reviewBatch, verify, verifyBatch };
