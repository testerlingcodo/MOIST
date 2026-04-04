const { query, newId } = require('../../config/db');

async function list({ page = 1, limit = 20, school_year, semester, student_id, status }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (school_year) { params.push(school_year); conditions.push('e.school_year = ?'); }
  if (semester) { params.push(semester); conditions.push('e.semester = ?'); }
  if (student_id) { params.push(student_id); conditions.push('e.student_id = ?'); }
  if (status) { params.push(status); conditions.push('e.status = ?'); }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT e.*,
            s.first_name, s.last_name, s.student_number,
            sub.code AS subject_code, sub.name AS subject_name, sub.units,
            sub.section_name, sub.schedule_days, sub.start_time, sub.end_time, sub.room
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${where}
     ORDER BY e.enrolled_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: cr } = await query(
    `SELECT COUNT(*) AS total FROM enrollments e WHERE ${where}`, params
  );
  return { data: rows, total: cr[0].total, page, limit };
}

async function getById(id) {
  const { rows } = await query(
    `SELECT e.*,
            s.first_name, s.last_name, s.student_number,
            sub.code AS subject_code, sub.name AS subject_name, sub.units,
            sub.section_name, sub.schedule_days, sub.start_time, sub.end_time, sub.room
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.id = ?`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
  return rows[0];
}

async function create({ student_id, subject_ids, school_year, semester }) {
  const ids = Array.isArray(subject_ids) ? subject_ids : [subject_ids];
  const results = [];

  for (const subject_id of ids) {
    // Check if already exists
    const { rows: existing } = await query(
      `SELECT id FROM enrollments
       WHERE student_id = ? AND subject_id = ? AND school_year = ? AND semester = ?`,
      [student_id, subject_id, school_year, semester]
    );
    if (existing.length > 0) continue;

    const id = newId();
    await query(
      `INSERT INTO enrollments (id, student_id, subject_id, school_year, semester)
       VALUES (?, ?, ?, ?, ?)`,
      [id, student_id, subject_id, school_year, semester]
    );
    const { rows } = await query('SELECT * FROM enrollments WHERE id = ?', [id]);
    if (rows[0]) results.push(rows[0]);
  }
  return results;
}

async function update(id, { status }) {
  const { rowCount } = await query(
    'UPDATE enrollments SET status = ? WHERE id = ?', [status, id]
  );
  if (rowCount === 0) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM enrollments WHERE id = ?', [id]);
  if (rowCount === 0) throw Object.assign(new Error('Enrollment not found'), { status: 404 });
}

module.exports = { list, getById, create, update, remove };
