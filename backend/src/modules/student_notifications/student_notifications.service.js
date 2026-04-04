const { query, newId } = require('../../config/db');

async function listForStudent(studentId) {
  const { rows } = await query(
    `SELECT * FROM student_notifications WHERE student_id = ? ORDER BY created_at DESC LIMIT 50`,
    [studentId]
  );
  return rows;
}

async function unreadCount(studentId) {
  const { rows } = await query(
    `SELECT COUNT(*) AS count FROM student_notifications WHERE student_id = ? AND is_read = 0`,
    [studentId]
  );
  return rows[0]?.count || 0;
}

async function markRead(id, studentId) {
  await query(
    `UPDATE student_notifications SET is_read = 1 WHERE id = ? AND student_id = ?`,
    [id, studentId]
  );
}

async function markAllRead(studentId) {
  await query(
    `UPDATE student_notifications SET is_read = 1 WHERE student_id = ?`,
    [studentId]
  );
}

async function create({ student_id, title, body, type = 'general' }) {
  const id = newId();
  await query(
    `INSERT INTO student_notifications (id, student_id, title, body, type) VALUES (?, ?, ?, ?, ?)`,
    [id, student_id, title, body, type]
  );
}

module.exports = { listForStudent, unreadCount, markRead, markAllRead, create };
