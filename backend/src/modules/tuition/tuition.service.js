const { query, newId } = require('../../config/db');

async function list({ page = 1, limit = 20, school_year, semester, course, year_level }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (school_year) { params.push(school_year); conditions.push('school_year = ?'); }
  if (semester) { params.push(semester); conditions.push('semester = ?'); }
  if (course) { params.push(course); conditions.push('course = ?'); }
  if (year_level) { params.push(year_level); conditions.push('year_level = ?'); }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT * FROM tuition WHERE ${where}
     ORDER BY school_year DESC, semester, course, year_level
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: cr } = await query(
    `SELECT COUNT(*) AS total FROM tuition WHERE ${where}`, params
  );
  return { data: rows, total: cr[0].total, page, limit };
}

async function getById(id) {
  const { rows } = await query('SELECT * FROM tuition WHERE id = ?', [id]);
  if (!rows[0]) throw Object.assign(new Error('Tuition record not found'), { status: 404 });
  return rows[0];
}

async function create({ school_year, semester, course, year_level, total_amount, per_unit_fee, misc_fee }) {
  const id = newId();
  const resolvedMisc = misc_fee ?? 0;
  const resolvedTotal = total_amount ?? ((per_unit_fee ?? 0) + resolvedMisc);
  await query(
    `INSERT INTO tuition (id, school_year, semester, course, year_level, total_amount, per_unit_fee, misc_fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, school_year, semester, course || null, year_level ?? null,
     resolvedTotal, per_unit_fee ?? null, resolvedMisc]
  );
  return getById(id);
}

async function update(id, data) {
  // Keep total_amount in sync if not explicitly provided
  if (data.total_amount === undefined && (data.per_unit_fee !== undefined || data.misc_fee !== undefined)) {
    const existing = await getById(id);
    const perUnit = data.per_unit_fee ?? existing.per_unit_fee ?? 0;
    const misc = data.misc_fee ?? existing.misc_fee ?? 0;
    data = { ...data, total_amount: perUnit + misc };
  }

  const allowed = ['school_year','semester','course','year_level','total_amount','per_unit_fee','misc_fee'];
  const fields = [];
  const params = [];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      // string-nullable: empty string → null; number-nullable: use ?? to keep 0
      let val = data[key];
      if (key === 'course') val = val || null;
      else if (key === 'year_level') val = val || null;
      else val = val ?? null;
      params.push(val);
      fields.push(`${key} = ?`);
    }
  }
  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });

  params.push(id);
  const { rowCount } = await query(
    `UPDATE tuition SET ${fields.join(', ')} WHERE id = ?`, params
  );
  if (rowCount === 0) throw Object.assign(new Error('Tuition record not found'), { status: 404 });
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query('DELETE FROM tuition WHERE id = ?', [id]);
  if (rowCount === 0) throw Object.assign(new Error('Tuition record not found'), { status: 404 });
}

module.exports = { list, getById, create, update, remove };
