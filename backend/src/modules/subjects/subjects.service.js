const { query, newId } = require('../../config/db');

async function list({
  page = 1,
  limit = 50,
  search,
  is_active,
  is_open,
  course,
  year_level,
  semester,
  teacher_id,
}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (is_active !== undefined) {
    params.push(is_active ? 1 : 0);
    conditions.push('s.is_active = ?');
  }
  if (is_open !== undefined) {
    params.push(is_open ? 1 : 0);
    conditions.push('s.is_open = ?');
  }
  if (course) {
    params.push(course, course);
    conditions.push(
      '(s.course = ? OR (s.is_minor = 1 AND EXISTS (SELECT 1 FROM subject_minor_courses smc WHERE smc.subject_id = s.id AND smc.course = ?)))'
    );
  }
  if (year_level) {
    params.push(year_level);
    conditions.push('s.year_level = ?');
  }
  if (semester) {
    params.push(semester);
    conditions.push('s.semester = ?');
  }
  if (teacher_id) {
    params.push(teacher_id);
    conditions.push('s.teacher_id = ?');
  }
  if (search) {
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    conditions.push('(s.name LIKE ? OR s.code LIKE ? OR COALESCE(s.course, \'\') LIKE ?)');
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT s.*,
            (SELECT GROUP_CONCAT(smc.course ORDER BY smc.course SEPARATOR ',')
             FROM subject_minor_courses smc WHERE smc.subject_id = s.id) AS minor_courses_csv,
            prereq.code AS prerequisite_code, prereq.name AS prerequisite_name,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.specialization AS teacher_specialization
     FROM subjects s
     LEFT JOIN subjects prereq ON prereq.id = s.prerequisite_subject_id
     LEFT JOIN teachers t ON t.id = s.teacher_id
     WHERE ${where}
     ORDER BY s.course, s.year_level, FIELD(s.semester, '1st', '2nd', 'summer'), s.code
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: cr } = await query(
    `SELECT COUNT(*) AS total FROM subjects s WHERE ${where}`,
    params
  );

  const data = rows.map((r) => ({
    ...r,
    minor_courses: r.minor_courses_csv ? r.minor_courses_csv.split(',') : [],
    minor_courses_csv: undefined,
  }));

  return { data, total: cr[0].total, page, limit };
}

async function getById(id) {
  const { rows } = await query(
    `SELECT s.*,
            prereq.code AS prerequisite_code, prereq.name AS prerequisite_name,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name, t.specialization AS teacher_specialization
     FROM subjects s
     LEFT JOIN subjects prereq ON prereq.id = s.prerequisite_subject_id
     LEFT JOIN teachers t ON t.id = s.teacher_id
     WHERE s.id = ?`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });

  const subject = rows[0];
  const { rows: mcRows } = await query(
    'SELECT course FROM subject_minor_courses WHERE subject_id = ? ORDER BY course',
    [id]
  );
  subject.minor_courses = mcRows.map((r) => r.course);

  return subject;
}

async function create(data) {
  const id = newId();
  const {
    code,
    name,
    description,
    units,
    course,
    year_level,
    semester,
    prerequisite_subject_id,
    section_name,
    schedule_days,
    start_time,
    end_time,
    room,
    teacher_id,
    is_open,
    is_minor,
    minor_courses,
  } = data;

  const subjectCourse = is_minor ? null : (course || null);

  await query(
    `INSERT INTO subjects
     (id, code, name, description, units, course, year_level, semester, prerequisite_subject_id,
      section_name, schedule_days, start_time, end_time, room, teacher_id, is_open, is_minor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      code,
      name,
      description || null,
      units || 3,
      subjectCourse,
      year_level || null,
      semester || null,
      prerequisite_subject_id || null,
      section_name || null,
      schedule_days || null,
      start_time || null,
      end_time || null,
      room || null,
      teacher_id || null,
      is_open === undefined ? 1 : (is_open ? 1 : 0),
      is_minor ? 1 : 0,
    ]
  );

  if (is_minor && Array.isArray(minor_courses) && minor_courses.length) {
    for (const c of minor_courses) {
      await query(
        'INSERT IGNORE INTO subject_minor_courses (subject_id, course) VALUES (?, ?)',
        [id, c]
      );
    }
  }

  return getById(id);
}

async function update(id, data) {
  const allowed = [
    'code',
    'name',
    'description',
    'units',
    'course',
    'year_level',
    'semester',
    'prerequisite_subject_id',
    'section_name',
    'schedule_days',
    'start_time',
    'end_time',
    'room',
    'teacher_id',
    'is_active',
    'is_open',
    'is_minor',
  ];
  const fields = [];
  const params = [];

  // If switching to minor, clear the course column
  const isMinor = data.is_minor !== undefined ? !!data.is_minor : undefined;

  for (const key of allowed) {
    if (data[key] !== undefined) {
      let value;
      if (['is_active', 'is_open', 'is_minor'].includes(key)) {
        value = data[key] ? 1 : 0;
      } else if (key === 'course' && isMinor) {
        value = null; // Minor subjects have no single course
      } else {
        value = data[key] === '' ? null : data[key];
      }
      params.push(value);
      fields.push(`${key} = ?`);
    }
  }

  // If switching to minor, force course = NULL
  if (isMinor && !fields.includes('course = ?') && data.is_minor !== undefined) {
    fields.push('course = ?');
    params.push(null);
  }

  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });

  params.push(id);
  const { rowCount } = await query(
    `UPDATE subjects SET ${fields.join(', ')} WHERE id = ?`,
    params
  );
  if (rowCount === 0) throw Object.assign(new Error('Subject not found'), { status: 404 });

  // Replace minor_courses if provided
  if (data.minor_courses !== undefined) {
    await query('DELETE FROM subject_minor_courses WHERE subject_id = ?', [id]);
    if (Array.isArray(data.minor_courses) && data.minor_courses.length) {
      for (const c of data.minor_courses) {
        await query(
          'INSERT IGNORE INTO subject_minor_courses (subject_id, course) VALUES (?, ?)',
          [id, c]
        );
      }
    }
  }

  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query(
    'UPDATE subjects SET is_active = 0, is_open = 0 WHERE id = ?',
    [id]
  );
  if (rowCount === 0) throw Object.assign(new Error('Subject not found'), { status: 404 });
}

module.exports = { list, getById, create, update, remove };
