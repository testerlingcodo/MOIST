const bcrypt = require('bcryptjs');
const { query, newId } = require('../../config/db');

async function list({ page = 1, limit = 20, role, search }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ["role <> 'student'"];
  const params = [];

  if (role) { params.push(role); conditions.push('role = ?'); }
  if (search) { params.push(`%${search}%`); conditions.push('email LIKE ?'); }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT id, email, role, is_active, created_at
     FROM users WHERE ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM users WHERE ${where}`, params
  );
  return { data: rows, total: countRows[0].total, page, limit };
}

async function getById(id) {
  const { rows } = await query(
    "SELECT id, email, role, is_active, created_at FROM users WHERE id = ? AND role <> 'student'",
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('User not found'), { status: 404 });
  return rows[0];
}

async function create({ email, password, role }) {
  if (role === 'student') {
    throw Object.assign(new Error('Student accounts must be created from the Students module'), { status: 400 });
  }

  const hash = await bcrypt.hash(password, 10);
  const id = newId();
  await query(
    'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
    [id, email, hash, role]
  );
  return getById(id);
}

async function update(id, { email, password, role, is_active }) {
  if (role === 'student') {
    throw Object.assign(new Error('Student accounts must be managed from the Students module'), { status: 400 });
  }

  const fields = [];
  const params = [];

  if (email !== undefined) { params.push(email); fields.push('email = ?'); }
  if (password !== undefined) {
    params.push(await bcrypt.hash(password, 10));
    fields.push('password = ?');
  }
  if (role !== undefined) { params.push(role); fields.push('role = ?'); }
  if (is_active !== undefined) { params.push(is_active ? 1 : 0); fields.push('is_active = ?'); }

  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });

  params.push(id);
  const { rowCount } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ? AND role <> 'student'`, params
  );
  if (rowCount === 0) throw Object.assign(new Error('User not found'), { status: 404 });
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query(
    "UPDATE users SET is_active = 0 WHERE id = ? AND role <> 'student'",
    [id]
  );
  if (rowCount === 0) throw Object.assign(new Error('User not found'), { status: 404 });
}

module.exports = { list, getById, create, update, remove };
