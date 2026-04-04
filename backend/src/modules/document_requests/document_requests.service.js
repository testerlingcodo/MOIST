const { query, newId } = require('../../config/db');
const notifService = require('../student_notifications/student_notifications.service');

const DOCUMENT_TYPES = [
  'Transcript of Records (TOR)',
  'Certificate of Enrollment',
  'Certificate of Good Standing',
  'Certificate of Graduation',
  'Diploma',
  'Form 137',
  'Authentication',
  'Honorable Dismissal',
  'Course Description',
  'Other',
];

async function listForStudent(studentId) {
  const { rows } = await query(
    `SELECT dr.*, s.first_name, s.last_name, s.student_number, s.course, s.year_level
     FROM document_requests dr
     JOIN students s ON s.id = dr.student_id
     WHERE dr.student_id = ?
     ORDER BY dr.requested_at DESC`,
    [studentId]
  );
  return rows;
}

async function listAll({ status, search, page = 1, limit = 30 }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];
  if (status) { conditions.push('dr.status = ?'); params.push(status); }
  if (search) {
    conditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ? OR dr.document_type LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT dr.*, s.first_name, s.last_name, s.student_number, s.course, s.year_level
     FROM document_requests dr
     JOIN students s ON s.id = dr.student_id
     WHERE ${where}
     ORDER BY dr.requested_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: cr } = await query(
    `SELECT COUNT(*) AS total FROM document_requests dr JOIN students s ON s.id = dr.student_id WHERE ${where}`,
    params
  );
  return { data: rows, total: cr[0].total, page, limit };
}

async function create({ student_id, document_type, purpose, copies }) {
  const id = newId();
  await query(
    'INSERT INTO document_requests (id, student_id, document_type, purpose, copies) VALUES (?, ?, ?, ?, ?)',
    [id, student_id, document_type, purpose || null, copies || 1]
  );
  const { rows } = await query('SELECT * FROM document_requests WHERE id = ?', [id]);
  return rows[0];
}

async function updateStatus(id, { status, remarks }) {
  const allowed = ['pending', 'in_process', 'ready_for_release', 'completed', 'rejected'];
  if (!allowed.includes(status)) throw Object.assign(new Error('Invalid status'), { status: 400 });
  await query('UPDATE document_requests SET status = ?, remarks = ? WHERE id = ?', [status, remarks || null, id]);
  const { rows } = await query('SELECT * FROM document_requests WHERE id = ?', [id]);
  if (!rows[0]) throw Object.assign(new Error('Request not found'), { status: 404 });

  if (status === 'ready_for_release') {
    const req = rows[0];
    await notifService.create({
      student_id: req.student_id,
      title: 'Document Ready for Pickup',
      body: `Your request for "${req.document_type}" is ready. Please visit the Registrar's Office to claim your document${remarks ? `: ${remarks}` : '.'}`,
      type: 'document',
    }).catch(() => {}); // fire-and-forget, never fail the main update
  }

  return rows[0];
}

module.exports = { DOCUMENT_TYPES, listForStudent, listAll, create, updateStatus };
