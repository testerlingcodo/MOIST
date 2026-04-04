const bcrypt = require('bcryptjs');
const { query, newId } = require('../../config/db');
const teacherService = require('../teachers/teachers.service');

async function list({ page = 1, limit = 20, search, course, status, year_level, teacher_user_id }) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (teacher_user_id) {
    const teacher = await teacherService.getByUserId(teacher_user_id);
    if (!teacher.assigned_subject_ids?.length) {
      return { data: [], total: 0, page, limit };
    }

    const subjectPlaceholders = teacher.assigned_subject_ids.map(() => '?').join(', ');
    conditions.push(
      `EXISTS (
        SELECT 1
        FROM enrollments e
        WHERE e.student_id = s.id AND e.subject_id IN (${subjectPlaceholders})
      )`
    );
    params.push(...teacher.assigned_subject_ids);

    if (teacher.assigned_year_level) {
      params.push(teacher.assigned_year_level);
      conditions.push('s.year_level = ?');
    }
  }

  if (status) { params.push(status); conditions.push('s.status = ?'); }
  if (course) { params.push(course); conditions.push('s.course = ?'); }
  if (year_level) { params.push(year_level); conditions.push('s.year_level = ?'); }
  if (search) {
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    conditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ? OR s.email LIKE ?)');
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT s.*, u.email AS user_email,
            eb.status AS enrollment_process_status,
            eb.school_year AS enrollment_process_school_year,
            eb.semester AS enrollment_process_semester
     FROM students s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN enrollment_batches eb ON eb.id = (
       SELECT eb2.id
       FROM enrollment_batches eb2
       WHERE eb2.student_id = s.id
         AND eb2.status <> 'dropped'
       ORDER BY eb2.created_at DESC
       LIMIT 1
     )
     WHERE ${where}
     ORDER BY s.last_name, s.first_name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total FROM students s WHERE ${where}`, params
  );
  return { data: rows, total: countRows[0].total, page, limit };
}

async function getById(id) {
  const { rows } = await query(
    `SELECT s.*, u.email AS user_email,
            eb.status AS enrollment_process_status,
            eb.school_year AS enrollment_process_school_year,
            eb.semester AS enrollment_process_semester
     FROM students s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN enrollment_batches eb ON eb.id = (
       SELECT eb2.id
       FROM enrollment_batches eb2
       WHERE eb2.student_id = s.id
         AND eb2.status <> 'dropped'
       ORDER BY eb2.created_at DESC
       LIMIT 1
     )
     WHERE s.id = ?`,
    [id]
  );
  if (!rows[0]) throw Object.assign(new Error('Student not found'), { status: 404 });
  return rows[0];
}

async function teacherCanAccessStudent(teacherUserId, studentId) {
  const teacher = await teacherService.getByUserId(teacherUserId);
  if (!teacher.assigned_subject_ids?.length) return false;

  const subjectPlaceholders = teacher.assigned_subject_ids.map(() => '?').join(', ');
  const conditions = ['e.student_id = ?', `e.subject_id IN (${subjectPlaceholders})`];
  const params = [studentId, ...teacher.assigned_subject_ids];

  if (teacher.assigned_year_level) {
    conditions.push('s.year_level = ?');
    params.push(teacher.assigned_year_level);
  }

  const { rows } = await query(
    `SELECT e.id
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     WHERE ${conditions.join(' AND ')}
     LIMIT 1`,
    params
  );

  return rows.length > 0;
}

async function generateStudentNumber() {
  const { rows } = await query(
    `SELECT student_number FROM students
     WHERE student_number REGEXP '^C[0-9]+$'
     ORDER BY CAST(SUBSTRING(student_number, 2) AS UNSIGNED) DESC
     LIMIT 1`
  );
  if (!rows[0]) return 'C001';
  const last = parseInt(rows[0].student_number.slice(1), 10);
  return 'C' + String(last + 1).padStart(3, '0');
}

async function create(data) {
  const { email, password, ...studentData } = data;

  // Auto-generate student number if not provided
  const student_number = studentData.student_number || await generateStudentNumber();

  let userId = null;
  if (password) {
    const hash = await bcrypt.hash(password, 10);
    userId = newId();
    await query(
      'INSERT INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
      [userId, email || null, hash, 'student']
    );
  }

  const id = newId();
  const {
    first_name, last_name, middle_name, name_extension,
    birthdate, birthplace, gender, civil_status,
    address, contact_number,
    year_level, course, major, status,
    guardian_name, guardian_contact, enrollment_type,
    mother_name, father_name,
    elementary_school, elementary_year, junior_high_school, junior_high_year,
    senior_high_school, strand, senior_high_year,
    school_last_attended, school_last_attended_address, course_section_last_attended, year_last_attended,
    disability_type, disability_cause, school_year, semester,
    employment_status, company_name, company_location,
    religion, als_info, ip_info, is_solo_parent,
  } = studentData;

  await query(
    `INSERT INTO students
     (id, user_id, student_number, first_name, last_name, middle_name, name_extension,
      birthdate, birthplace, gender, civil_status, address, contact_number, email,
      year_level, course, major, status,
      guardian_name, guardian_contact, enrollment_type, mother_name, father_name,
      elementary_school, elementary_year, junior_high_school, junior_high_year,
      senior_high_school, strand, senior_high_year,
      school_last_attended, school_last_attended_address, course_section_last_attended, year_last_attended,
      disability_type, disability_cause, school_year, semester,
      employment_status, company_name, company_location,
      religion, als_info, ip_info, is_solo_parent)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, userId, student_number, first_name, last_name, middle_name || null, name_extension || null,
      birthdate || null, birthplace || null, gender || null, civil_status || null,
      address || null, contact_number || null, email || null,
      year_level || null, course || null, major || null, status || 'active',
      guardian_name || null, guardian_contact || null, enrollment_type || null,
      mother_name || null, father_name || null,
      elementary_school || null, elementary_year || null, junior_high_school || null, junior_high_year || null,
      senior_high_school || null, strand || null, senior_high_year || null,
      school_last_attended || null, school_last_attended_address || null,
      course_section_last_attended || null, year_last_attended || null,
      disability_type || null, disability_cause || null, school_year || null, semester || null,
      employment_status || null, company_name || null, company_location || null,
      religion || null, als_info || null, ip_info || null, is_solo_parent ? 1 : 0,
    ]
  );
  return getById(id);
}

async function update(id, data) {
  const allowed = [
    'first_name','last_name','middle_name','name_extension',
    'birthdate','birthplace','gender','civil_status',
    'address','contact_number','email','year_level','course','major','status',
    'guardian_name','guardian_contact','enrollment_type','mother_name','father_name',
    'elementary_school','elementary_year','junior_high_school','junior_high_year',
    'senior_high_school','strand','senior_high_year',
    'school_last_attended','school_last_attended_address','course_section_last_attended','year_last_attended',
    'disability_type','disability_cause','school_year','semester',
    'employment_status','company_name','company_location',
    'religion','als_info','ip_info','is_solo_parent',
  ];
  const fields = [];
  const params = [];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      params.push(data[key]);
      fields.push(`${key} = ?`);
    }
  }
  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });

  params.push(id);
  const { rowCount } = await query(
    `UPDATE students SET ${fields.join(', ')} WHERE id = ?`, params
  );
  if (rowCount === 0) throw Object.assign(new Error('Student not found'), { status: 404 });
  return getById(id);
}

async function approve(id) {
  const { rowCount } = await query(
    "UPDATE students SET status = 'active' WHERE id = ? AND status = 'pending'", [id]
  );
  if (rowCount === 0) throw Object.assign(new Error('Student not found or not pending'), { status: 404 });
  return getById(id);
}

async function reject(id) {
  const { rowCount } = await query(
    "UPDATE students SET status = 'rejected' WHERE id = ? AND status = 'pending'", [id]
  );
  if (rowCount === 0) throw Object.assign(new Error('Student not found or not pending'), { status: 404 });
  return getById(id);
}

async function remove(id) {
  const { rowCount } = await query(
    "UPDATE students SET status = 'inactive' WHERE id = ?", [id]
  );
  if (rowCount === 0) throw Object.assign(new Error('Student not found'), { status: 404 });
}

async function getGrades(studentId, teacher_user_id) {
  const conditions = ['e.student_id = ?'];
  const params = [studentId];

  if (teacher_user_id) {
    const teacher = await teacherService.getByUserId(teacher_user_id);
    if (!teacher.assigned_subject_ids?.length) return [];
    const subjectPlaceholders = teacher.assigned_subject_ids.map(() => '?').join(', ');
    conditions.push(`e.subject_id IN (${subjectPlaceholders})`);
    params.push(...teacher.assigned_subject_ids);
  }

  const { rows } = await query(
    `SELECT g.*, sub.code, sub.name AS subject_name, sub.units,
            e.school_year, e.semester, e.status AS enrollment_status
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.school_year DESC, e.semester`,
    params
  );
  return rows;
}

async function getEnrollments(studentId, teacher_user_id) {
  const conditions = ['e.student_id = ?'];
  const params = [studentId];

  if (teacher_user_id) {
    const teacher = await teacherService.getByUserId(teacher_user_id);
    if (!teacher.assigned_subject_ids?.length) return [];
    const subjectPlaceholders = teacher.assigned_subject_ids.map(() => '?').join(', ');
    conditions.push(`e.subject_id IN (${subjectPlaceholders})`);
    params.push(...teacher.assigned_subject_ids);
  }

  const { rows } = await query(
    `SELECT e.*, sub.code, sub.name AS subject_name, sub.units,
            sub.section_name, sub.schedule_days, sub.start_time, sub.end_time, sub.room,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name,
            CASE WHEN g.prelim_status IN ('under_review','official') THEN g.prelim_grade    ELSE NULL END AS prelim_grade,
            CASE WHEN g.midterm_status IN ('under_review','official') THEN g.midterm_grade   ELSE NULL END AS midterm_grade,
            CASE WHEN g.semi_final_status IN ('under_review','official') THEN g.semi_final_grade ELSE NULL END AS semi_final_grade,
            CASE WHEN g.final_status IN ('under_review','official')            THEN g.final_grade      ELSE NULL END AS grade,
            CASE WHEN g.final_status IN ('under_review','official')            THEN g.remarks          ELSE NULL END AS remarks,
            g.submission_status AS grade_status,
            g.prelim_status, g.midterm_status, g.semi_final_status, g.final_status
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN teachers t ON t.id = sub.teacher_id
     LEFT JOIN grades g ON g.enrollment_id = e.id
     WHERE ${conditions.join(' AND ')}
     ORDER BY e.school_year DESC, FIELD(e.semester, '1st', '2nd', 'summer'), sub.code`,
    params
  );
  return rows;
}

async function getPayments(studentId) {
  const { rows } = await query(
    `SELECT p.*, t.total_amount AS tuition_total
     FROM payments p
     LEFT JOIN tuition t ON t.id = p.tuition_id
     WHERE p.student_id = ?
     ORDER BY p.created_at DESC`,
    [studentId]
  );
  return rows;
}

async function getProspectus(studentId) {
  const student = await getById(studentId);
  const course = student.course;

  if (!course) {
    throw Object.assign(new Error('Student has no course assigned'), { status: 422 });
  }

  // Subjects based on dean's class schedule (is_open=1) plus any already enrolled.
  // Includes teacher and schedule info set by the dean.
  const { rows } = await query(
    `SELECT
       sub.id            AS subject_id,
       sub.code,
       sub.name,
       sub.units,
       sub.year_level,
       sub.semester,
       sub.course        AS subject_course,
       sub.section_name,
       sub.schedule_days,
       sub.start_time,
       sub.end_time,
       sub.room,
       sub.is_open,
       CONCAT(t.first_name, ' ', t.last_name) AS teacher_name,
       e.id              AS enrollment_id,
       e.school_year,
       g.id              AS grade_id,
       g.prelim_grade,
       g.midterm_grade,
       g.semi_final_grade,
       g.final_grade,
       g.remarks,
       g.submission_status AS grade_status
     FROM subjects sub
     LEFT JOIN teachers t ON t.id = sub.teacher_id
     LEFT JOIN enrollments e ON e.id = (
       SELECT e2.id FROM enrollments e2
       WHERE e2.subject_id = sub.id
         AND e2.student_id = ?
         AND e2.status != 'dropped'
       ORDER BY e2.enrolled_at DESC
       LIMIT 1
     )
     LEFT JOIN grades g ON g.enrollment_id = e.id
     WHERE (
       (sub.is_minor = 0 AND (sub.course = ? OR sub.course IS NULL))
       OR (sub.is_minor = 1 AND EXISTS (
         SELECT 1 FROM subject_minor_courses smc
         WHERE smc.subject_id = sub.id AND smc.course = ?
       ))
     )
       AND sub.is_active = 1
       AND (sub.is_open = 1 OR e.id IS NOT NULL)
     ORDER BY sub.year_level,
       FIELD(sub.semester, '1st', '2nd', 'summer'),
       sub.code`,
    [studentId, course, course]
  );

  // Calculate GPA from official passed/failed grades
  const officialRows = rows.filter(r => r.grade_status === 'official' && r.final_grade != null);
  const totalUnits = officialRows.reduce((acc, r) => acc + (r.units || 0), 0);
  const weightedSum = officialRows.reduce((acc, r) => acc + (parseFloat(r.final_grade) * (r.units || 0)), 0);
  const gpa = totalUnits > 0 ? (weightedSum / totalUnits).toFixed(2) : null;

  return {
    student: {
      id: student.id,
      name: `${student.first_name} ${student.last_name}`,
      student_number: student.student_number,
      course,
      year_level: student.year_level,
    },
    gpa,
    subjects: rows,
  };
}

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  approve,
  reject,
  teacherCanAccessStudent,
  getGrades,
  getEnrollments,
  getPayments,
  getProspectus,
};
