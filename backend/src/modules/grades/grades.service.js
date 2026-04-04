const { query, newId } = require('../../config/db');
const teacherService = require('../teachers/teachers.service');
const academicSettingsService = require('../academic_settings/academic_settings.service');
const studentProgressionService = require('../students/student_progression.service');
const studentNotificationService = require('../student_notifications/student_notifications.service');

const PERIODS = [
  { key: 'prelim', field: 'prelim_grade', statusField: 'prelim_status', label: 'Prelim' },
  { key: 'midterm', field: 'midterm_grade', statusField: 'midterm_status', label: 'Midterm' },
  { key: 'semi_final', field: 'semi_final_grade', statusField: 'semi_final_status', label: 'Semi-Final' },
  { key: 'final', field: 'final_grade', statusField: 'final_status', label: 'Final' },
];

function getPeriodStatus(grade, meta) {
  return grade?.[meta.statusField] || 'draft';
}

function isApprovedStatus(status) {
  return ['under_review', 'official'].includes(status);
}

function getActivePeriodMeta(grade) {
  for (const meta of PERIODS) {
    if (!isApprovedStatus(getPeriodStatus(grade, meta))) {
      return meta;
    }
  }
  return null;
}

function getSubmittedPeriodMeta(grade) {
  return PERIODS.find((meta) => getPeriodStatus(grade, meta) === 'submitted') || null;
}

function getRegistrarPeriodMeta(grade) {
  return PERIODS.find((meta) => getPeriodStatus(grade, meta) === 'under_review') || null;
}

function deriveSubmissionStatus(grade) {
  const active = getActivePeriodMeta(grade);
  if (active) return getPeriodStatus(grade, active);
  return getPeriodStatus(grade, PERIODS[PERIODS.length - 1]) === 'official' ? 'official' : 'under_review';
}

function getTeacherPayloadFields(data) {
  return ['prelim_grade', 'midterm_grade', 'semi_final_grade', 'final_grade', 'remarks']
    .filter((field) => data[field] !== undefined);
}

function isDroppedPayload(data) {
  return data?.remarks === 'dropped';
}

function normalizeGradePayload(data) {
  if (!isDroppedPayload(data)) {
    return data;
  }

  return {
    ...data,
    prelim_grade: 5.0,
    midterm_grade: 5.0,
    semi_final_grade: 5.0,
    final_grade: 5.0,
    remarks: 'dropped',
  };
}

function assertTeacherCanEditPayload(grade, data) {
  const touchedFields = getTeacherPayloadFields(data);
  if (!touchedFields.length) return;

  const active = getActivePeriodMeta(grade);
  if (!active) {
    throw Object.assign(new Error('All grading periods are already locked'), { status: 409 });
  }

  if (isDroppedPayload(data)) {
    return;
  }

  const allowed = new Set([active.field]);
  if (active.key === 'final') allowed.add('remarks');

  const invalid = touchedFields.filter((field) => !allowed.has(field));
  if (invalid.length) {
    throw Object.assign(new Error(`Only the ${active.label} grade can be edited right now`), { status: 409 });
  }
}

async function getTeacherScope(userId) {
  const teacher = await teacherService.getByUserId(userId);
  if (!teacher.assigned_subject_ids?.length) {
    throw Object.assign(new Error('Teacher has no assigned subjects'), { status: 403 });
  }
  return teacher;
}

function applyTeacherScope(teacher, conditions, params) {
  const placeholders = teacher.assigned_subject_ids.map(() => '?').join(', ');
  conditions.push(`e.subject_id IN (${placeholders})`);
  params.push(...teacher.assigned_subject_ids);

  if (teacher.assigned_year_level) {
    conditions.push('s.year_level = ?');
    params.push(teacher.assigned_year_level);
  }
}

async function list({
  page = 1,
  limit = 20,
  school_year,
  semester,
  subject_id,
  submission_status,
  teacher_user_id,
  course,
  year_level,
} = {}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ['1=1'];
  const params = [];

  if (school_year) {
    params.push(school_year);
    conditions.push('e.school_year = ?');
  }
  if (semester) {
    params.push(semester);
    conditions.push('e.semester = ?');
  }
  if (subject_id) {
    params.push(subject_id);
    conditions.push('e.subject_id = ?');
  }
  if (submission_status) {
    params.push(submission_status);
    conditions.push('g.submission_status = ?');
  }
  if (teacher_user_id) {
    const teacher = await getTeacherScope(teacher_user_id);
    applyTeacherScope(teacher, conditions, params);
    const activeTerm = await academicSettingsService.getActive();
    if (!activeTerm) {
      return { data: [], total: 0, page, limit };
    }
    conditions.push('e.school_year = ?');
    params.push(activeTerm.school_year);
    conditions.push('e.semester = ?');
    params.push(activeTerm.semester);
  }
  if (course) {
    params.push(course);
    conditions.push('s.course = ?');
  }
  if (year_level) {
    params.push(Number(year_level));
    conditions.push('s.year_level = ?');
  }

  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT g.*, e.school_year, e.semester,
            s.id AS student_id, s.student_number, s.first_name, s.last_name, s.course, s.year_level,
            sub.code AS subject_code, sub.name AS subject_name
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${where}
     ORDER BY s.last_name, s.first_name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const { rows: countRows } = await query(
    `SELECT COUNT(*) AS total
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${where}`,
    params
  );

  return { data: rows, total: countRows[0].total, page, limit };
}

async function getById(id, teacher_user_id) {
  const conditions = ['g.id = ?'];
  const params = [id];

  if (teacher_user_id) {
    const teacher = await getTeacherScope(teacher_user_id);
    applyTeacherScope(teacher, conditions, params);
  }

  const { rows } = await query(
    `SELECT g.*, e.school_year, e.semester, e.subject_id,
            s.id AS student_id, s.student_number, s.first_name, s.last_name, s.course, s.year_level,
            sub.code AS subject_code, sub.name AS subject_name
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (!rows[0]) throw Object.assign(new Error('Grade not found'), { status: 404 });
  return rows[0];
}

async function getTeacherEnrollment(enrollmentId, teacherUserId) {
  const teacher = await getTeacherScope(teacherUserId);
  const conditions = ['e.id = ?'];
  const params = [enrollmentId];
  applyTeacherScope(teacher, conditions, params);

  const { rows } = await query(
    `SELECT e.id, e.school_year, e.semester
     FROM enrollments e
     JOIN students s ON s.id = e.student_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE ${conditions.join(' AND ')}`,
    params
  );

  if (!rows[0]) {
    throw Object.assign(new Error('Forbidden: enrollment is outside assigned subject'), { status: 403 });
  }

  return rows[0];
}

async function assertTeacherActiveTerm(record, label) {
  await academicSettingsService.assertActiveTermMatch(record.school_year, record.semester, label);
}

async function syncSubmissionStatus(id) {
  const grade = await getById(id);
  const nextStatus = deriveSubmissionStatus(grade);
  await query('UPDATE grades SET submission_status = ? WHERE id = ?', [nextStatus, id]);
}

async function create({
  enrollment_id,
  prelim_grade,
  midterm_grade,
  semi_final_grade,
  final_grade,
  remarks,
  encoded_by,
}, actor) {
  if (actor.role === 'teacher') {
    const enrollment = await getTeacherEnrollment(enrollment_id, actor.sub);
    await assertTeacherActiveTerm(enrollment, 'Grade encoding');
  }

  const { rows: existing } = await query(
    'SELECT id FROM grades WHERE enrollment_id = ?',
    [enrollment_id]
  );

  const payload = normalizeGradePayload({
    prelim_grade,
    midterm_grade,
    semi_final_grade,
    final_grade,
    remarks,
  });

    if (existing.length > 0) {
      const existingGrade = await getById(existing[0].id, actor.role === 'teacher' ? actor.sub : undefined);

      if (actor.role === 'teacher') {
        await assertTeacherActiveTerm(existingGrade, 'Grade editing');
        assertTeacherCanEditPayload(existingGrade, payload);
      }

    const fields = [];
    const params = [];

    if (payload.prelim_grade !== undefined) {
      fields.push('prelim_grade = ?');
      params.push(payload.prelim_grade);
    }
    if (payload.midterm_grade !== undefined) {
      fields.push('midterm_grade = ?');
      params.push(payload.midterm_grade);
    }
    if (payload.semi_final_grade !== undefined) {
      fields.push('semi_final_grade = ?');
      params.push(payload.semi_final_grade);
    }
    if (payload.final_grade !== undefined) {
      fields.push('final_grade = ?');
      params.push(payload.final_grade);
    }
    if (payload.remarks !== undefined) {
      fields.push('remarks = ?');
      params.push(payload.remarks);
    }

    fields.push('encoded_by = ?');
    params.push(encoded_by ?? null);
    params.push(enrollment_id);

    await query(
      `UPDATE grades
       SET ${fields.join(', ')}
       WHERE enrollment_id = ?`,
      params
    );
    await syncSubmissionStatus(existing[0].id);
    return getById(existing[0].id, actor.role === 'teacher' ? actor.sub : undefined);
  }

  if (actor.role === 'teacher') {
    assertTeacherCanEditPayload({
      prelim_status: 'draft',
      midterm_status: 'draft',
      semi_final_status: 'draft',
      final_status: 'draft',
    }, payload);
  }

  const id = newId();
  await query(
    `INSERT INTO grades
     (id, enrollment_id, prelim_grade, midterm_grade, semi_final_grade, final_grade, remarks, submission_status, encoded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    [
      id,
      enrollment_id,
      payload.prelim_grade ?? null,
      payload.midterm_grade ?? null,
      payload.semi_final_grade ?? null,
      payload.final_grade ?? null,
      payload.remarks ?? null,
      encoded_by ?? null,
    ]
  );

  return getById(id, actor.role === 'teacher' ? actor.sub : undefined);
}

async function update(id, { prelim_grade, midterm_grade, semi_final_grade, final_grade, remarks }, actor) {
  const grade = await getById(id, actor.role === 'teacher' ? actor.sub : undefined);
  const payload = normalizeGradePayload({
    prelim_grade,
    midterm_grade,
    semi_final_grade,
    final_grade,
    remarks,
  });

  if (actor.role === 'teacher') {
    await assertTeacherActiveTerm(grade, 'Grade editing');
    assertTeacherCanEditPayload(grade, payload);
  }

  const fields = [];
  const params = [];

  if (payload.prelim_grade !== undefined) {
    params.push(payload.prelim_grade);
    fields.push('prelim_grade = ?');
  }
  if (payload.midterm_grade !== undefined) {
    params.push(payload.midterm_grade);
    fields.push('midterm_grade = ?');
  }
  if (payload.semi_final_grade !== undefined) {
    params.push(payload.semi_final_grade);
    fields.push('semi_final_grade = ?');
  }
  if (payload.final_grade !== undefined) {
    params.push(payload.final_grade);
    fields.push('final_grade = ?');
  }
  if (payload.remarks !== undefined) {
    params.push(payload.remarks);
    fields.push('remarks = ?');
  }

  if (!fields.length) throw Object.assign(new Error('No fields to update'), { status: 400 });

  params.push(id);
  const { rowCount } = await query(
    `UPDATE grades SET ${fields.join(', ')} WHERE id = ?`,
    params
  );

  if (rowCount === 0) throw Object.assign(new Error('Grade not found'), { status: 404 });
  await syncSubmissionStatus(id);
  return getById(id, actor.role === 'teacher' ? actor.sub : undefined);
}

async function submit(id, actor) {
  const grade = await getById(id, actor.role === 'teacher' ? actor.sub : undefined);
  if (actor.role === 'teacher') {
    await assertTeacherActiveTerm(grade, 'Grade submission');
  }
  const activePeriod = getActivePeriodMeta(grade);

  if (!activePeriod) {
    throw Object.assign(new Error('All grading periods are already locked'), { status: 409 });
  }

  if (getPeriodStatus(grade, activePeriod) === 'submitted') {
    throw Object.assign(new Error('Grade is already in the dean review queue'), { status: 409 });
  }

  if (grade[activePeriod.field] === null || grade[activePeriod.field] === undefined) {
    throw Object.assign(new Error(`Encode the ${activePeriod.label} grade before submitting`), { status: 422 });
  }

  const { rowCount } = await query(
    `UPDATE grades
     SET ${activePeriod.statusField} = 'submitted', submitted_by = ?, submitted_at = NOW()
     WHERE id = ?`,
    [actor.sub, id]
  );

  if (rowCount === 0) throw Object.assign(new Error('Grade not found'), { status: 404 });
  await syncSubmissionStatus(id);
  return getById(id, actor.role === 'teacher' ? actor.sub : undefined);
}

async function review(id, actor) {
  const grade = await getById(id);
  await academicSettingsService.assertActiveTermMatch(grade.school_year, grade.semester, 'Dean approval');
  const submittedPeriod = getSubmittedPeriodMeta(grade);

  if (!submittedPeriod) {
    throw Object.assign(new Error('Only submitted grades can be approved by the dean'), { status: 409 });
  }

  await query(
    `UPDATE grades SET ${submittedPeriod.statusField} = 'under_review', reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
    [actor.sub, id]
  );
  await syncSubmissionStatus(id);
  await studentNotificationService.create({
    student_id: grade.student_id,
    title: `${submittedPeriod.label} Grade Posted`,
    body: `Your ${submittedPeriod.label.toLowerCase()} grade for ${grade.subject_code} is now available in the portal.`,
    type: 'grade',
  }).catch(() => {});
  if (submittedPeriod.key === 'final') {
    await studentProgressionService.syncStudentYearLevel(grade.student_id);
  }
  return getById(id);
}

async function reviewBatch(ids, actor) {
  if (!ids?.length) throw Object.assign(new Error('No grade IDs provided'), { status: 400 });

  let updated = 0;
  for (const id of ids) {
    try {
      await review(id, actor);
      updated += 1;
    } catch {
      // Skip rows that are no longer pending dean approval.
    }
  }

  return { updated };
}

async function verify(id, actor) {
  const grade = await getById(id);
  const registrarPeriod = getRegistrarPeriodMeta(grade);

  if (!registrarPeriod) {
    throw Object.assign(new Error('Grade cannot be verified at current status'), { status: 409 });
  }

  await query(
    `UPDATE grades SET ${registrarPeriod.statusField} = 'official', verified_by = ?, verified_at = NOW() WHERE id = ?`,
    [actor.sub, id]
  );
  await syncSubmissionStatus(id);
  if (registrarPeriod.key === 'final') {
    await studentProgressionService.syncStudentYearLevel(grade.student_id);
  }
  return getById(id);
}

async function verifyBatch(ids, actor) {
  if (!ids?.length) throw Object.assign(new Error('No grade IDs provided'), { status: 400 });

  let updated = 0;
  for (const id of ids) {
    try {
      await verify(id, actor);
      updated += 1;
    } catch {
      // Skip rows that are no longer pending registrar verification.
    }
  }

  return { updated };
}

module.exports = { list, getById, create, update, submit, review, reviewBatch, verify, verifyBatch };
