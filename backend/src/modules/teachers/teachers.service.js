const bcrypt = require('bcryptjs');
const { query, newId } = require('../../config/db');
const academicSettingsService = require('../academic_settings/academic_settings.service');

async function getAssignedSubjects(teacherId) {
  const { rows } = await query(
    `SELECT s.id, s.code, s.name, s.units, s.course, s.year_level, s.semester, s.section_name,
            s.schedule_days, s.start_time, s.end_time, s.room, s.is_minor,
            (SELECT GROUP_CONCAT(smc.course ORDER BY smc.course SEPARATOR ',')
             FROM subject_minor_courses smc WHERE smc.subject_id = s.id) AS minor_courses_csv
     FROM subjects s
     WHERE s.teacher_id = ? AND s.is_active = 1
     ORDER BY semester, code`,
    [teacherId]
  );
  return rows.map((subject) => ({
    ...subject,
    minor_courses: subject.minor_courses_csv ? subject.minor_courses_csv.split(',') : [],
    minor_courses_csv: undefined,
  }));
}

function serializeTeacher(base, assigned_subjects = []) {
  const assigned_subject_ids = assigned_subjects.map((subject) => subject.id);
  const assigned_subject_codes = assigned_subjects.map((subject) => subject.code);

  return {
    ...base,
    assigned_subjects,
    assigned_subject_ids,
    assigned_subject_codes,
    assigned_subject_count: assigned_subjects.length,
    assigned_subject_summary: assigned_subjects
      .map((subject) => `${subject.code} - ${subject.name}`)
      .join(', '),
    assigned_subject_id: assigned_subjects[0]?.id || null,
    assigned_subject_code: assigned_subjects[0]?.code || null,
    assigned_subject_name: assigned_subjects[0]?.name || null,
    assigned_subject_units: assigned_subjects[0]?.units || null,
  };
}

async function getTeacherBase(whereClause, params) {
  const { rows } = await query(
    `SELECT t.*, u.email, u.is_active AS user_is_active
     FROM teachers t
     JOIN users u ON u.id = t.user_id
     WHERE ${whereClause}
     LIMIT 1`,
    params
  );
  if (!rows[0]) throw Object.assign(new Error('Teacher not found'), { status: 404 });
  const assigned_subjects = await getAssignedSubjects(rows[0].id);
  return serializeTeacher(rows[0], assigned_subjects);
}

async function list({ page = 1, limit = 20, search, assigned_course, assigned_year_level, is_active }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (assigned_course) {
    params.push(assigned_course);
    conditions.push('t.assigned_course = ?');
  }
  if (assigned_year_level) {
    params.push(assigned_year_level);
    conditions.push('t.assigned_year_level = ?');
  }
  if (is_active !== undefined) {
    params.push(is_active ? 1 : 0);
    conditions.push('t.is_active = ?');
  }
  if (search) {
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    conditions.push(
      `(t.first_name LIKE ? OR t.last_name LIKE ? OR u.email LIKE ? OR COALESCE(t.specialization, '') LIKE ? OR EXISTS (
        SELECT 1 FROM subjects ss
        WHERE ss.teacher_id = t.id
          AND (ss.code LIKE ? OR ss.name LIKE ?)
      ))`
    );
    params.push(`%${search}%`);
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT t.*, u.email, u.is_active AS user_is_active
     FROM teachers t
     JOIN users u ON u.id = t.user_id
     WHERE ${where}
     ORDER BY t.last_name, t.first_name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total
     FROM teachers t
     JOIN users u ON u.id = t.user_id
     WHERE ${where}`,
    params
  );

  const data = await Promise.all(rows.map(async (teacher) => (
    serializeTeacher(teacher, await getAssignedSubjects(teacher.id))
  )));

  return { data, total: countRows[0].total, page, limit };
}

async function getById(id) {
  return getTeacherBase('t.id = ?', [id]);
}

async function getByUserId(userId) {
  return getTeacherBase('t.user_id = ?', [userId]);
}

async function getMyStudents(userId) {
  const teacher = await getByUserId(userId);
  const activeTerm = await academicSettingsService.getActive();
  const activeSubjects = activeTerm
    ? (teacher.assigned_subjects || []).filter((subject) => subject.semester === activeTerm.semester)
    : [];
  const subjectIds = activeSubjects.map((subject) => subject.id);

  if (!subjectIds.length) return [];

  const placeholders = subjectIds.map(() => '?').join(', ');
  const conditions = [`e.subject_id IN (${placeholders})`, `e.status = 'enrolled'`];
  const params = [...subjectIds];

  if (activeTerm) {
    conditions.push('e.school_year = ?');
    params.push(activeTerm.school_year);
    conditions.push('e.semester = ?');
    params.push(activeTerm.semester);
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT e.id AS enrollment_id, e.school_year, e.semester, e.subject_id,
            s.student_number, s.first_name, s.last_name, s.course, s.year_level,
            sub.code AS subject_code, sub.name AS subject_name,
            g.id AS grade_id, g.prelim_grade, g.midterm_grade, g.semi_final_grade, g.final_grade, g.remarks,
            g.submission_status, g.prelim_status, g.midterm_status, g.semi_final_status, g.final_status, g.encoded_by
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     WHERE ${where}
     ORDER BY sub.code, s.last_name, s.first_name`,
    params
  );

  // Normalise: expose grade_id as id so front-end can call /grades/:id
  return rows.map((r) => ({
    ...r,
    id: r.grade_id,
  }));
}

async function getMyWorkload(userId) {
  const teacher = await getByUserId(userId);
  const activeTerm = await academicSettingsService.getActive();
  const activeSubjects = activeTerm
    ? (teacher.assigned_subjects || []).filter((subject) => subject.semester === activeTerm.semester)
    : [];
  const scopedTeacher = serializeTeacher(teacher, activeSubjects);
  const subjectIds = scopedTeacher.assigned_subject_ids || [];

  if (!subjectIds.length) {
    return {
      ...scopedTeacher,
      total_students: 0,
      total_grades: 0,
      submitted_grades: 0,
      draft_grades: 0,
    };
  }

  const placeholders = subjectIds.map(() => '?').join(', ');
  const conditions = [`e.subject_id IN (${placeholders})`];
  const params = [...subjectIds];

  if (activeTerm) {
    conditions.push('e.school_year = ?');
    params.push(activeTerm.school_year);
    conditions.push('e.semester = ?');
    params.push(activeTerm.semester);
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT COUNT(DISTINCT e.student_id) AS total_students,
            COUNT(g.id) AS total_grades,
            SUM(CASE WHEN g.submission_status = 'submitted' THEN 1 ELSE 0 END) AS submitted_grades,
            SUM(CASE WHEN g.id IS NOT NULL AND (g.submission_status IS NULL OR g.submission_status = 'draft') THEN 1 ELSE 0 END) AS draft_grades
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     WHERE ${where}`,
    params
  );

  return {
    ...scopedTeacher,
    total_students: rows[0]?.total_students || 0,
    total_grades: rows[0]?.total_grades || 0,
    submitted_grades: rows[0]?.submitted_grades || 0,
    draft_grades: rows[0]?.draft_grades || 0,
  };
}

async function create(data) {
  const {
    email,
    password,
    first_name,
    last_name,
    middle_name,
    contact_number,
    specialization,
    assigned_course,
    assigned_year_level,
    assigned_subject_id,
  } = data;

  const userId = newId();
  const teacherId = newId();
  const hash = await bcrypt.hash(password, 10);

  await query(
    'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
    [userId, email, hash, 'teacher']
  );

  await query(
    `INSERT INTO teachers
     (id, user_id, first_name, last_name, middle_name, contact_number, specialization, assigned_course, assigned_year_level, assigned_subject_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      teacherId,
      userId,
      first_name,
      last_name,
      middle_name || null,
      contact_number || null,
      specialization || null,
      assigned_course || null,
      assigned_year_level || null,
      assigned_subject_id || null,
    ]
  );

  if (assigned_subject_id) {
    await query('UPDATE subjects SET teacher_id = ? WHERE id = ?', [teacherId, assigned_subject_id]);
  }

  return getById(teacherId);
}

async function update(id, data) {
  const teacher = await getById(id);
  const teacherFields = [];
  const teacherParams = [];
  const teacherAllowed = [
    'first_name',
    'last_name',
    'middle_name',
    'contact_number',
    'specialization',
    'assigned_course',
    'assigned_year_level',
    'assigned_subject_id',
    'is_active',
  ];

  for (const key of teacherAllowed) {
    if (data[key] !== undefined) {
      teacherParams.push(data[key] === '' ? null : data[key]);
      teacherFields.push(`${key} = ?`);
    }
  }

  if (teacherFields.length) {
    teacherParams.push(id);
    await query(`UPDATE teachers SET ${teacherFields.join(', ')} WHERE id = ?`, teacherParams);
  }

  if (data.assigned_subject_id !== undefined) {
    await query('UPDATE subjects SET teacher_id = NULL WHERE teacher_id = ? AND id <> ?', [
      id,
      data.assigned_subject_id || '',
    ]);
    if (data.assigned_subject_id) {
      await query('UPDATE subjects SET teacher_id = ? WHERE id = ?', [id, data.assigned_subject_id]);
    }
  }

  const userFields = [];
  const userParams = [];
  if (data.email !== undefined) {
    userParams.push(data.email);
    userFields.push('email = ?');
  }
  if (data.password !== undefined && data.password !== '') {
    userParams.push(await bcrypt.hash(data.password, 10));
    userFields.push('password = ?');
  }
  if (data.is_active !== undefined) {
    userParams.push(data.is_active ? 1 : 0);
    userFields.push('is_active = ?');
  }

  if (userFields.length) {
    userParams.push(teacher.user_id);
    await query(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userParams);
  }

  return getById(id);
}

async function remove(id) {
  const teacher = await getById(id);
  await query('UPDATE subjects SET teacher_id = NULL WHERE teacher_id = ?', [id]);
  await query('UPDATE teachers SET is_active = 0 WHERE id = ?', [id]);
  await query('UPDATE users SET is_active = 0 WHERE id = ?', [teacher.user_id]);
}

async function assignLoad(teacherId, subjectId) {
  await getById(teacherId); // ensure teacher exists

  const { rows: subjectRows } = await query('SELECT id, teacher_id FROM subjects WHERE id = ?', [subjectId]);
  if (!subjectRows[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });
  if (subjectRows[0].teacher_id && subjectRows[0].teacher_id !== teacherId) {
    // Only block if the referenced teacher still exists (prevents stale teacher_id from blocking assignment)
    const { rows: ownerRows } = await query('SELECT id FROM teachers WHERE id = ?', [subjectRows[0].teacher_id]);
    if (ownerRows[0]) {
      throw Object.assign(new Error('Subject is already assigned to another instructor'), { status: 409 });
    }
  }

  await query('UPDATE subjects SET teacher_id = ? WHERE id = ?', [teacherId, subjectId]);
  return getById(teacherId);
}

async function removeLoad(teacherId, subjectId) {
  await query('UPDATE subjects SET teacher_id = NULL WHERE id = ? AND teacher_id = ?', [subjectId, teacherId]);
  return getById(teacherId);
}

module.exports = { list, getById, getByUserId, getMyStudents, getMyWorkload, create, update, remove, assignLoad, removeLoad };
