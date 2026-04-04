const service = require('./payments.service');

async function list(req, res, next) {
  try {
    const { page, limit, status, school_year, semester, student_id } = req.query;
    res.json(await service.list({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status, school_year, semester, student_id,
    }));
  } catch (err) { next(err); }
}

async function getById(req, res, next) {
  try {
    const payment = await service.getById(req.params.id);
    // Students can only view their own payments
    if (req.user.role === 'student') {
      const { rows } = require('../../config/db').query
        ? [] : [];
      // Simple check: student can only see their own
      if (payment.student_id !== req.user.studentId) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }
    res.json(payment);
  } catch (err) { next(err); }
}

async function createLink(req, res, next) {
  try {
    // Students can only create for themselves
    if (req.user.role === 'student') {
      req.body.student_id = req.user.studentId;
    }
    const result = await service.createLink(req.body);
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function webhook(req, res, next) {
  try {
    const signature = req.headers['x-paymongo-signature'];
    const rawBody = req.body.toString();
    const result = await service.handleWebhook(rawBody, signature);
    res.json(result);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message });
    next(err);
  }
}

async function refund(req, res, next) {
  try {
    res.json(await service.refund(req.params.id));
  } catch (err) { next(err); }
}

async function listByBatch(req, res, next) {
  try {
    const rows = await service.listByBatch(req.params.batchId);
    res.json(rows);
  } catch (err) { next(err); }
}

async function recordCash(req, res, next) {
  try {
    const cashier_id = req.user.sub;
    const payment = await service.recordCash({ ...req.body, cashier_id });
    res.status(201).json(payment);
  } catch (err) { next(err); }
}

async function submitOnline(req, res, next) {
  try {
    const student_id = req.user.studentId;
    const payment = await service.submitOnline({ ...req.body, student_id });
    res.status(201).json(payment);
  } catch (err) { next(err); }
}

async function verify(req, res, next) {
  try {
    const payment = await service.verify(req.params.id, { verified_by: req.user.sub });
    res.json(payment);
  } catch (err) { next(err); }
}

async function reject(req, res, next) {
  try {
    const payment = await service.reject(req.params.id, {
      verified_by: req.user.sub,
      notes: req.body.notes,
    });
    res.json(payment);
  } catch (err) { next(err); }
}

async function recordInstallment(req, res, next) {
  try {
    const payment = await service.recordInstallment({ ...req.body, cashier_id: req.user.sub });
    res.status(201).json(payment);
  } catch (err) { next(err); }
}

async function cancelXendit(req, res, next) {
  try {
    const result = await service.cancelXenditInvoice(req.params.id, req.user.studentId);
    res.json(result);
  } catch (err) { next(err); }
}

async function xenditCreate(req, res, next) {
  try {
    const student_id = req.user.studentId;
    const { batch_id, amount } = req.body;
    const result = await service.createXenditInvoice({ batch_id, student_id, amount });
    res.status(201).json(result);
  } catch (err) { next(err); }
}

async function xenditWebhook(req, res, next) {
  try {
    const token = req.headers['x-callback-token'] || '';
    const result = await service.handleXenditWebhook(req.body, token);
    res.json(result);
  } catch (err) {
    if (err.status === 401) return res.status(401).json({ error: err.message });
    next(err);
  }
}

module.exports = { list, getById, createLink, webhook, refund, listByBatch, recordCash, recordInstallment, submitOnline, verify, reject, xenditCreate, xenditWebhook, cancelXendit };
