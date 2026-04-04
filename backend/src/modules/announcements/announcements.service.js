'use strict';
const { query, newId } = require('../../config/db');

async function list({ page = 1, limit = 20, category } = {}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];
  if (category) { conditions.push('a.category = ?'); params.push(category); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRes = await query(`SELECT COUNT(*) AS total FROM announcements a ${where}`, params);
  const dataRes = await query(
    `SELECT a.*, u.email AS posted_by_email
     FROM announcements a
     LEFT JOIN users u ON u.id = a.posted_by
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: dataRes.rows, total: countRes.rows[0]?.total || 0, page, limit };
}

async function create({ title, body, category = 'general', posted_by }) {
  const id = newId();
  await query(
    'INSERT INTO announcements (id, title, body, category, posted_by) VALUES (?, ?, ?, ?, ?)',
    [id, title, body, category, posted_by]
  );
  const res = await query('SELECT * FROM announcements WHERE id = ?', [id]);
  return res.rows[0];
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM announcements WHERE id = ?', [id]);
  if (rowCount === 0) throw Object.assign(new Error('Announcement not found'), { status: 404 });
}

module.exports = { list, create, remove };
