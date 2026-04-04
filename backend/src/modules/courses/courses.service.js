const { query, newId } = require('../../config/db');

function parseYearLevels(raw) {
  if (!raw) return [1, 2, 3, 4];
  return raw.split(',').map(Number).filter(Boolean).sort();
}

function serializeCourse(row) {
  return {
    ...row,
    year_levels_offered: parseYearLevels(row.year_levels_offered),
  };
}

async function list({ activeOnly = false } = {}) {
  const sql = activeOnly
    ? 'SELECT * FROM courses WHERE is_active = 1 ORDER BY code ASC'
    : 'SELECT * FROM courses ORDER BY code ASC';
  const { rows } = await query(sql);
  return rows.map(serializeCourse);
}

async function create({ code, name, year_levels_offered }) {
  const id = newId();
  const ylo = Array.isArray(year_levels_offered) && year_levels_offered.length
    ? year_levels_offered.sort().join(',')
    : '1,2,3,4';
  await query(
    'INSERT INTO courses (id, code, name, year_levels_offered) VALUES (?, ?, ?, ?)',
    [id, code.trim().toUpperCase(), name || null, ylo]
  );
  const { rows } = await query('SELECT * FROM courses WHERE id = ?', [id]);
  return serializeCourse(rows[0]);
}

async function update(id, { code, name, is_active, year_levels_offered }) {
  const fields = [];
  const params = [];
  if (code !== undefined)      { fields.push('code = ?');      params.push(code.trim().toUpperCase()); }
  if (name !== undefined)      { fields.push('name = ?');      params.push(name || null); }
  if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
  if (year_levels_offered !== undefined) {
    const ylo = Array.isArray(year_levels_offered) && year_levels_offered.length
      ? year_levels_offered.sort().join(',')
      : '1,2,3,4';
    fields.push('year_levels_offered = ?');
    params.push(ylo);
  }
  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });
  params.push(id);
  const { rowCount } = await query(`UPDATE courses SET ${fields.join(', ')} WHERE id = ?`, params);
  if (rowCount === 0) throw Object.assign(new Error('Course not found'), { status: 404 });
  const { rows } = await query('SELECT * FROM courses WHERE id = ?', [id]);
  return serializeCourse(rows[0]);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM courses WHERE id = ?', [id]);
  if (rowCount === 0) throw Object.assign(new Error('Course not found'), { status: 404 });
}

module.exports = { list, create, update, remove };
