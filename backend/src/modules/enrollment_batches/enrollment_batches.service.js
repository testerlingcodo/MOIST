'use strict';

const { query, newId } = require('../../config/db');
const academicSettingsService = require('../academic_settings/academic_settings.service');
const studentProgressionService = require('../students/student_progression.service');

async function list({ page = 1, limit = 20, status, school_year, semester, student_id, course, search } = {}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (status) { conditions.push('eb.status = ?'); params.push(status); }
  if (school_year) { conditions.push('eb.school_year = ?'); params.push(school_year); }
  if (semester) { conditions.push('eb.semester = ?'); params.push(semester); }
  if (student_id) { conditions.push('eb.student_id = ?'); params.push(student_id); }
  if (course) { conditions.push('s.course = ?'); params.push(course); }
  if (search) {
    conditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRes = await query(
    `SELECT COUNT(*) AS total FROM enrollment_batches eb JOIN students s ON s.id = eb.student_id ${where}`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT eb.*,
            s.first_name, s.last_name, s.student_number, s.course, s.year_level, s.enrollment_type
     FROM enrollment_batches eb
     JOIN students s ON s.id = eb.student_id
     ${where}
     ORDER BY eb.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: dataRes.rows, total };
}

async function getById(id) {
  const batchRes = await query(
    `SELECT eb.*,
            s.first_name, s.last_name, s.student_number, s.course, s.year_level, s.enrollment_type
     FROM enrollment_batches eb
     JOIN students s ON s.id = eb.student_id
     WHERE eb.id = ?`,
    [id]
  );
  if (!batchRes.rows.length) {
    throw Object.assign(new Error('Enrollment batch not found'), { status: 404 });
  }
  const batch = batchRes.rows[0];
  const enrolledOnlyCondition = batch.status === 'enrolled' ? " AND e.status = 'enrolled'" : '';

  const subjectsRes = await query(
    `SELECT e.id AS enrollment_id, e.status AS enrollment_status,
            sub.id AS subject_id, sub.code AS subject_code, sub.name AS subject_name, sub.units,
            sub.section_name, sub.schedule_days, sub.start_time, sub.end_time, sub.room,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
     FROM enrollments e
     JOIN subjects sub ON sub.id = e.subject_id
     LEFT JOIN teachers t ON t.id = sub.teacher_id
     WHERE e.batch_id = ?${enrolledOnlyCondition}`,
    [id]
  );
  batch.subjects = subjectsRes.rows;

  // Fetch tuition config — prefer exact match, fall back to All Years / All Courses records
  const tuitionRes = await query(
    `SELECT * FROM tuition
     WHERE (course = ? OR course IS NULL)
       AND (year_level = ? OR year_level IS NULL)
       AND semester = ?
     ORDER BY CASE WHEN school_year = ? THEN 0 ELSE 1 END,
              CASE WHEN course = ? THEN 0 ELSE 1 END,
              CASE WHEN year_level = ? THEN 0 ELSE 1 END,
              school_year DESC
     LIMIT 1`,
    [batch.course, batch.year_level, batch.semester, batch.school_year, batch.course, batch.year_level]
  );
  const tuition = tuitionRes.rows[0];
  const totalUnits = batch.subjects.reduce((sum, s) => sum + Number(s.units || 0), 0);

  if (tuition) {
    batch.misc_fee = Number(tuition.misc_fee || 0);
    batch.per_unit_fee = Number(tuition.per_unit_fee || 0);
    batch.total_units = totalUnits;

    if (!batch.assessed_amount) {
      if (Number(tuition.per_unit_fee) > 0) {
        batch.assessed_amount = batch.per_unit_fee * totalUnits + batch.misc_fee;
      } else {
        batch.assessed_amount = Number(tuition.total_amount || 0) + batch.misc_fee;
      }
    }
  } else {
    batch.misc_fee = batch.misc_fee ?? 0;
  }

  return batch;
}

async function getDefaultSubjectIds(student_id, semester, options = {}) {
  const { subjects, student } = await listEligibleSubjects(student_id, semester, options);
  if (!subjects.length) {
    throw Object.assign(
      new Error(`No eligible subject offerings found for ${student.course} Year ${student.year_level} ${semester} semester`),
      { status: 422 }
    );
  }

  return subjects.map((subject) => subject.id);
}

async function validateRequestedSubjectIds(student_id, semester, subject_ids = [], options = {}) {
  const uniqueSubjectIds = [...new Set((Array.isArray(subject_ids) ? subject_ids : []).filter(Boolean))];
  if (!uniqueSubjectIds.length) {
    return getDefaultSubjectIds(student_id, semester, options);
  }

  const allowedSubjectIds = new Set(await getDefaultSubjectIds(student_id, semester, options));
  const invalidSubjectIds = uniqueSubjectIds.filter((subjectId) => !allowedSubjectIds.has(subjectId));

  if (invalidSubjectIds.length) {
    throw Object.assign(
      new Error(`Some selected subjects are not available for the currently active term: ${invalidSubjectIds.join(', ')}`),
      { status: 422 }
    );
  }

  return uniqueSubjectIds;
}

async function getStudentProgram(student_id) {
  const synced = await studentProgressionService.syncStudentYearLevel(student_id);
  return {
    course: synced.course,
    year_level: synced.yearLevel,
  };
}

async function getPassedSubjectIds(student_id) {
  const { rows } = await query(
    `SELECT DISTINCT e.subject_id
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     WHERE e.student_id = ?
       AND g.submission_status IN ('under_review', 'official')
       AND (g.remarks = 'passed' OR (g.final_grade IS NOT NULL AND g.final_grade + 0 <= 3.0))`,
    [student_id]
  );

  return new Set(rows.map((row) => row.subject_id));
}

async function getLatestAttempts(student_id, subjectIds = []) {
  if (!subjectIds.length) return new Map();

  const placeholders = subjectIds.map(() => '?').join(', ');
  const { rows } = await query(
    `SELECT e.subject_id, g.final_grade, g.remarks, e.school_year, e.semester
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     WHERE e.student_id = ?
       AND e.subject_id IN (${placeholders})
       AND g.submission_status IN ('under_review', 'official')
     ORDER BY e.school_year DESC,
              FIELD(e.semester, '1st', '2nd', 'summer') DESC,
              COALESCE(g.updated_at, g.encoded_at) DESC`,
    [student_id, ...subjectIds]
  );

  const attemptMap = new Map();
  rows.forEach((row) => {
    if (!attemptMap.has(row.subject_id)) {
      attemptMap.set(row.subject_id, row);
    }
  });
  return attemptMap;
}

function parseScheduleDays(scheduleDays) {
  if (!scheduleDays) return [];

  const raw = String(scheduleDays).toUpperCase().replace(/[^A-Z]/g, '');
  const parsed = [];
  let index = 0;

  while (index < raw.length) {
    if (raw.startsWith('MON', index)) { parsed.push('Mon'); index += 3; continue; }
    if (raw.startsWith('TUE', index)) { parsed.push('Tue'); index += 3; continue; }
    if (raw.startsWith('WED', index)) { parsed.push('Wed'); index += 3; continue; }
    if (raw.startsWith('THU', index)) { parsed.push('Thu'); index += 3; continue; }
    if (raw.startsWith('FRI', index)) { parsed.push('Fri'); index += 3; continue; }
    if (raw.startsWith('SAT', index)) { parsed.push('Sat'); index += 3; continue; }
    if (raw.startsWith('SUN', index)) { parsed.push('Sun'); index += 3; continue; }
    if (raw.startsWith('TH', index)) { parsed.push('Thu'); index += 2; continue; }

    const token = raw[index];
    if (token === 'M') parsed.push('Mon');
    else if (token === 'T') parsed.push('Tue');
    else if (token === 'W') parsed.push('Wed');
    else if (token === 'F') parsed.push('Fri');
    else if (token === 'S') parsed.push('Sat');
    else if (token === 'U') parsed.push('Sun');
    index += 1;
  }

  return [...new Set(parsed)];
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
}

function subjectsConflict(left, right) {
  const leftDays = parseScheduleDays(left.schedule_days);
  const rightDays = parseScheduleDays(right.schedule_days);
  if (!leftDays.length || !rightDays.length || !leftDays.some((day) => rightDays.includes(day))) {
    return false;
  }

  const leftStart = timeToMinutes(left.start_time);
  const leftEnd = timeToMinutes(left.end_time);
  const rightStart = timeToMinutes(right.start_time);
  const rightEnd = timeToMinutes(right.end_time);
  if ([leftStart, leftEnd, rightStart, rightEnd].some((value) => value == null)) {
    return false;
  }

  return leftStart < rightEnd && rightStart < leftEnd;
}

async function assertNoScheduleConflicts(subjectIds) {
  if (!subjectIds.length) return;

  const placeholders = subjectIds.map(() => '?').join(', ');
  const { rows } = await query(
    `SELECT id, code, name, schedule_days, start_time, end_time
     FROM subjects
     WHERE id IN (${placeholders})`,
    subjectIds
  );

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (!subjectsConflict(rows[i], rows[j])) continue;

      const leftSchedule = `${rows[i].schedule_days || 'TBA'} ${rows[i].start_time || ''}-${rows[i].end_time || ''}`.trim();
      const rightSchedule = `${rows[j].schedule_days || 'TBA'} ${rows[j].start_time || ''}-${rows[j].end_time || ''}`.trim();
      throw Object.assign(
        new Error(`Schedule conflict detected between ${rows[i].code} and ${rows[j].code}. (${leftSchedule} vs ${rightSchedule})`),
        { status: 422 }
      );
    }
  }
}

async function listEligibleSubjects(student_id, semester, { includeAdvanced = false } = {}) {
  const student = await getStudentProgram(student_id);
  const passedSubjectIds = await getPassedSubjectIds(student_id);

  const subjectParams = [semester];
  const yearLevelFilter = includeAdvanced ? '' : 'AND s.year_level <= ?';
  if (!includeAdvanced) {
    subjectParams.push(student.year_level);
  }
  subjectParams.push(student.course, student.course);

  const { rows } = await query(
    `SELECT s.*,
            (SELECT GROUP_CONCAT(smc.course ORDER BY smc.course SEPARATOR ',')
             FROM subject_minor_courses smc WHERE smc.subject_id = s.id) AS minor_courses_csv,
            prereq.code AS prerequisite_code, prereq.name AS prerequisite_name,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
     FROM subjects s
     LEFT JOIN subjects prereq ON prereq.id = s.prerequisite_subject_id
     LEFT JOIN teachers t ON t.id = s.teacher_id
     WHERE s.is_active = 1
       AND s.is_open = 1
       AND s.semester = ?
       ${yearLevelFilter}
       AND (
         (s.is_minor = 0 AND s.course = ?)
         OR (s.is_minor = 1 AND EXISTS (
           SELECT 1 FROM subject_minor_courses smc WHERE smc.subject_id = s.id AND smc.course = ?
         ))
       )
     ORDER BY s.year_level, s.code`,
    subjectParams
  );

  const unpassedSubjects = rows.filter((subject) => !passedSubjectIds.has(subject.id));
  const latestAttempts = await getLatestAttempts(student_id, unpassedSubjects.map((subject) => subject.id));

  const subjects = unpassedSubjects
    .map((subject) => {
      const attempt = latestAttempts.get(subject.id) || null;
      const previousGrade = attempt?.final_grade ?? null;
      const previousRemarks = attempt?.remarks ?? null;
      const isFailedAttempt = Boolean(
        attempt && (
          previousRemarks === 'failed'
          || previousRemarks === 'dropped'
          || (previousGrade !== null && Number(previousGrade) > 3.0)
        )
      );
      const isBacklog = Number(subject.year_level || 0) < Number(student.year_level || 0);
      const isAdvanced = Number(subject.year_level || 0) > Number(student.year_level || 0);

      return {
        ...subject,
        minor_courses: subject.minor_courses_csv ? subject.minor_courses_csv.split(',') : [],
        minor_courses_csv: undefined,
        prerequisite_met: !subject.prerequisite_subject_id || passedSubjectIds.has(subject.prerequisite_subject_id),
        has_previous_attempt: Boolean(attempt),
        is_failed: isFailedAttempt,
        is_backlog: isBacklog,
        is_advanced: isAdvanced,
        is_retake: isBacklog || Boolean(attempt),
        previous_grade: previousGrade,
        previous_remarks: previousRemarks,
      };
    })
    .filter((subject) => subject.prerequisite_met);

  return { student, subjects };
}

async function create({ student_id, school_year, semester, created_by, subject_ids = [], status = 'pending' }) {
  if (!student_id || !school_year || !semester) {
    throw Object.assign(new Error('Student, school year, and semester are required'), { status: 400 });
  }

  await academicSettingsService.assertActiveTermMatch(school_year, semester, 'Enrollment');

  const batchStatus = status === 'for_subject_enrollment' ? 'for_subject_enrollment' : 'pending';

  // Check for existing active batch
  const existing = await query(
    `SELECT id FROM enrollment_batches
     WHERE student_id = ? AND school_year = ? AND semester = ?
       AND status NOT IN ('dropped')`,
    [student_id, school_year, semester]
  );
  if (existing.rows.length) {
    throw Object.assign(
      new Error('An active enrollment batch already exists for this student, year, and semester'),
      { status: 409 }
    );
  }

  const id = newId();
  await query(
    `INSERT INTO enrollment_batches (id, student_id, school_year, semester, status, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, student_id, school_year, semester, batchStatus, created_by]
  );

  const uniqueSubjectIds = await validateRequestedSubjectIds(student_id, semester, subject_ids);
  for (const subject_id of uniqueSubjectIds) {
    await query(
      `INSERT INTO enrollments (id, batch_id, student_id, subject_id, school_year, semester, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [newId(), id, student_id, subject_id, school_year, semester]
    );
  }

  return getById(id);
}

async function submitForEvaluation(id) {
  const batch = await getById(id);
  if (batch.status !== 'pending') {
    throw Object.assign(
      new Error(`Batch status must be 'pending' to send for subject enrollment (current: ${batch.status})`),
      { status: 422 }
    );
  }

  await query(
    `UPDATE enrollment_batches
     SET status = 'for_subject_enrollment'
     WHERE id = ?`,
    [id]
  );

  return getById(id);
}

async function evaluate(id, { subject_ids = [], dean_notes, dean_id, include_advanced = false, credited_subjects = [] }) {
  const batch = await getById(id);
  if (batch.status !== 'for_subject_enrollment') {
    throw Object.assign(
      new Error(`Batch status must be 'for_subject_enrollment' to enroll subjects (current: ${batch.status})`),
      { status: 422 }
    );
  }

  const validatedSubjectIds = await validateRequestedSubjectIds(
    batch.student_id,
    batch.semester,
    subject_ids,
    { includeAdvanced: Boolean(include_advanced) }
  );
  await assertNoScheduleConflicts(validatedSubjectIds);

  // Validate credited subjects (transferee only) — must have valid subject_id and final_grade <= 3.0
  const validatedCredited = [];
  if (Array.isArray(credited_subjects) && credited_subjects.length > 0) {
    if (batch.enrollment_type !== 'transferee') {
      throw Object.assign(new Error('Credit subjects are only allowed for transferee students'), { status: 422 });
    }
    for (const cs of credited_subjects) {
      const grade = Number(cs.final_grade);
      if (!cs.subject_id) throw Object.assign(new Error('Each credited subject must have a subject_id'), { status: 400 });
      if (isNaN(grade) || grade < 1.0 || grade > 3.0) {
        throw Object.assign(new Error(`Credited subject grade must be between 1.0 and 3.0 (passing), got: ${cs.final_grade}`), { status: 400 });
      }
      // Don't credit subjects that are already being enrolled this term
      if (validatedSubjectIds.includes(String(cs.subject_id))) {
        throw Object.assign(new Error(`Subject ${cs.subject_id} cannot be both enrolled and credited in the same term`), { status: 422 });
      }
      validatedCredited.push({ subject_id: String(cs.subject_id), final_grade: grade, source_school: cs.source_school || null });
    }
  }

  // Delete ALL enrollment records for this student/term to avoid uq_enrollment conflicts
  // (catches stale rows from pre-batch system or previous partial evaluations)
  await query(
    'DELETE FROM enrollments WHERE student_id = ? AND school_year = ? AND semester = ?',
    [batch.student_id, batch.school_year, batch.semester]
  );

  // Create new enrollment records for each regular subject
  for (const subject_id of validatedSubjectIds) {
    const enrollId = newId();
    await query(
      `INSERT INTO enrollments (id, batch_id, student_id, subject_id, school_year, semester, status)
       VALUES (?, ?, ?, ?, ?, ?, 'for_assessment')`,
      [enrollId, id, batch.student_id, subject_id, batch.school_year, batch.semester]
    );
  }

  // Create credited enrollment + grade records immediately (counted as passed in transcript)
  for (const cs of validatedCredited) {
    const enrollId = newId();
    await query(
      `INSERT INTO enrollments (id, batch_id, student_id, subject_id, school_year, semester, status)
       VALUES (?, ?, ?, ?, ?, ?, 'enrolled')`,
      [enrollId, id, batch.student_id, cs.subject_id, batch.school_year, batch.semester]
    );
    await query(
      `INSERT INTO grades (id, enrollment_id, final_grade, final_status, remarks, submission_status, is_credited, source_school, encoded_at)
       VALUES (?, ?, ?, 'official', 'passed', 'official', 1, ?, NOW())`,
      [newId(), enrollId, cs.final_grade, cs.source_school]
    );
  }

  await query(
    `UPDATE enrollment_batches
     SET status = 'for_assessment', dean_id = ?, dean_notes = ?, evaluated_at = NOW()
     WHERE id = ?`,
    [dean_id, dean_notes || null, id]
  );

  return getById(id);
}

async function approve(id, { approved_by }) {
  const batch = await getById(id);
  if (batch.status !== 'for_assessment') {
    throw Object.assign(
      new Error(`Batch status must be 'for_assessment' to approve (current: ${batch.status})`),
      { status: 422 }
    );
  }

  // Compute total units from the batch's subjects
  const totalUnits = (batch.subjects || []).reduce((sum, s) => sum + Number(s.units || 0), 0);

  // Look up tuition — prefer exact match, fall back to All Years / All Courses records
  const { rows: tuitionRows } = await query(
    `SELECT * FROM tuition
     WHERE (course = ? OR course IS NULL)
       AND (year_level = ? OR year_level IS NULL)
       AND semester = ?
     ORDER BY CASE WHEN school_year = ? THEN 0 ELSE 1 END,
              CASE WHEN course = ? THEN 0 ELSE 1 END,
              CASE WHEN year_level = ? THEN 0 ELSE 1 END,
              school_year DESC
     LIMIT 1`,
    [batch.course, batch.year_level, batch.semester, batch.school_year, batch.course, batch.year_level]
  );
  const tuition = tuitionRows[0] || null;

  // Compute base tuition for this term
  let baseTuition = null;
  if (tuition) {
    if (Number(tuition.per_unit_fee) > 0) {
      baseTuition = Number(tuition.per_unit_fee) * totalUnits + Number(tuition.misc_fee || 0);
    } else {
      baseTuition = Number(tuition.total_amount || 0) + Number(tuition.misc_fee || 0);
    }
  }

  // Carry-over: sum unpaid balances from all previous terms for this student
  const { rows: prevBatches } = await query(
    `SELECT eb.assessed_amount,
            COALESCE(bp.total, 0) + COALESCE(lp.total, 0) AS total_paid
     FROM enrollment_batches eb
     LEFT JOIN (
       SELECT batch_id, SUM(amount) AS total
       FROM payments
       WHERE status = 'verified' AND batch_id IS NOT NULL
       GROUP BY batch_id
     ) bp ON bp.batch_id = eb.id
     LEFT JOIN (
       SELECT student_id, school_year, semester, SUM(amount) AS total
       FROM payments
       WHERE status = 'verified' AND batch_id IS NULL
       GROUP BY student_id, school_year, semester
     ) lp ON lp.student_id = eb.student_id
          AND lp.school_year = eb.school_year
          AND lp.semester = eb.semester
     WHERE eb.student_id = ? AND eb.id != ?
       AND eb.status NOT IN ('dropped','pending','for_subject_enrollment','for_assessment')
       AND eb.assessed_amount IS NOT NULL`,
    [batch.student_id, id]
  );

  let carryOver = 0;
  for (const prev of prevBatches) {
    const bal = Number(prev.assessed_amount || 0) - Number(prev.total_paid || 0);
    if (bal > 0) carryOver += bal;
  }
  carryOver = Math.round(carryOver * 100) / 100;

  const assessedAmount = baseTuition !== null ? Math.round((baseTuition + carryOver) * 100) / 100 : null;

  await query(
    `UPDATE enrollments SET status = 'for_payment' WHERE batch_id = ?`,
    [id]
  );

  await query(
    `UPDATE enrollment_batches
     SET status = 'for_payment', approved_by = ?, approved_at = NOW(),
         assessed_amount = ?, carry_over_balance = ?
     WHERE id = ?`,
    [approved_by, assessedAmount, carryOver, id]
  );

  return getById(id);
}

async function checkAndAdvanceYearLevel(student_id, course, year_level) {
  return studentProgressionService.syncStudentYearLevel(student_id);

  // Get all major subject IDs for the student's current year level (all semesters)
  const { rows: majorSubjects } = await query(
    `SELECT id FROM subjects WHERE course = ? AND year_level = ? AND is_minor = 0`,
    [course, year_level]
  );
  if (!majorSubjects.length) return; // No major subjects defined — nothing to check

  const majorSubjectIds = majorSubjects.map((s) => s.id);
  const placeholders = majorSubjectIds.map(() => '?').join(', ');

  // Check how many of those majors the student has passed
  const { rows: passed } = await query(
    `SELECT DISTINCT e.subject_id
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     WHERE e.student_id = ?
       AND e.subject_id IN (${placeholders})
       AND g.submission_status IN ('under_review', 'official')
       AND (g.remarks = 'passed' OR (g.final_grade IS NOT NULL AND g.final_grade + 0 <= 3.0))`,
    [student_id, ...majorSubjectIds]
  );

  if (passed.length >= majorSubjectIds.length) {
    // All majors for this year level are passed — advance year level
    await query(
      `UPDATE students SET year_level = year_level + 1 WHERE id = ? AND year_level = ?`,
      [student_id, year_level]
    );
  }
}

async function register(id, { registered_by }) {
  const batch = await getById(id);
  if (batch.status !== 'for_registration') {
    throw Object.assign(
      new Error(`Batch status must be 'for_registration' to officially enroll (current: ${batch.status})`),
      { status: 422 }
    );
  }

  await query(
    `UPDATE enrollment_batches
     SET status = 'enrolled', registered_by = ?, registered_at = NOW()
     WHERE id = ?`,
    [registered_by, id]
  );

  await query(
    `UPDATE enrollments
     SET status = 'enrolled'
     WHERE batch_id = ?`,
    [id]
  );

  // Check if student has passed all major subjects for their year level → advance if so
  await studentProgressionService.syncStudentYearLevel(batch.student_id);

  return getById(id);
}

async function listUnenrolled({ school_year, semester, course }) {
  const conditions = ['eb.id IS NULL', "s.status = 'active'"];
  const params = [];

  if (course) { conditions.push('s.course = ?'); params.push(course); }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const joinParams = [];
  let joinCondition = 'eb.student_id = s.id AND eb.status NOT IN (\'dropped\')';
  if (school_year) { joinCondition += ' AND eb.school_year = ?'; joinParams.push(school_year); }
  if (semester) { joinCondition += ' AND eb.semester = ?'; joinParams.push(semester); }

  const { rows } = await query(
    `SELECT s.id, s.student_number, s.first_name, s.last_name, s.course, s.year_level, s.status
     FROM students s
     LEFT JOIN enrollment_batches eb ON ${joinCondition}
     ${where}
     ORDER BY s.last_name, s.first_name`,
    [...joinParams, ...params]
  );
  return { data: rows, total: rows.length };
}

async function remove(id) {
  await query('DELETE FROM enrollment_batches WHERE id = ?', [id]);
}

async function listCourses() {
  const { rows } = await query(
    `SELECT DISTINCT course FROM (
       SELECT course FROM students WHERE course IS NOT NULL AND course != ''
       UNION
       SELECT course FROM subjects WHERE course IS NOT NULL AND course != ''
     ) t ORDER BY course`
  );
  return rows.map(r => r.course);
}

async function listAssessments({ page = 1, limit = 50, school_year, semester, course, year_level, search } = {}) {
  page = parseInt(page); limit = parseInt(limit);
  const offset = (page - 1) * limit;
  const conditions = ["eb.status NOT IN ('dropped', 'pending', 'for_subject_enrollment', 'for_assessment')"];
  const params = [];

  if (school_year) { conditions.push('eb.school_year = ?'); params.push(school_year); }
  if (semester) { conditions.push('eb.semester = ?'); params.push(semester); }
  if (course) { conditions.push('s.course = ?'); params.push(course); }
  if (year_level) { conditions.push('s.year_level = ?'); params.push(year_level); }
  if (search) {
    conditions.push('(s.first_name LIKE ? OR s.last_name LIKE ? OR s.student_number LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  const countRes = await query(
    `SELECT COUNT(*) AS total FROM enrollment_batches eb JOIN students s ON s.id = eb.student_id ${where}`,
    params
  );
  const total = countRes.rows[0]?.total || 0;

  const dataRes = await query(
    `SELECT eb.id, eb.school_year, eb.semester, eb.status, eb.assessed_amount,
            COALESCE(eb.carry_over_balance, 0) AS carry_over_balance,
            eb.student_id, s.first_name, s.last_name, s.student_number, s.course, s.year_level,
            COALESCE(bp.total, 0) + COALESCE(lp.total, 0) AS total_paid
     FROM enrollment_batches eb
     JOIN students s ON s.id = eb.student_id
     LEFT JOIN (
       SELECT batch_id, SUM(amount) AS total
       FROM payments
       WHERE status = 'verified' AND batch_id IS NOT NULL
       GROUP BY batch_id
     ) bp ON bp.batch_id = eb.id
     LEFT JOIN (
       SELECT student_id, school_year, semester, SUM(amount) AS total
       FROM payments
       WHERE status = 'verified' AND batch_id IS NULL
       GROUP BY student_id, school_year, semester
     ) lp ON lp.student_id = eb.student_id AND lp.school_year = eb.school_year AND lp.semester = eb.semester
     ${where}
     ORDER BY s.last_name, s.first_name
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: dataRes.rows, total };
}

async function getAvailableSubjects(id, { includeAdvanced = false } = {}) {
  // Fetch batch + student info
  const batchRes = await query(
    `SELECT eb.id, eb.student_id, eb.semester, s.course, s.year_level
     FROM enrollment_batches eb
     JOIN students s ON s.id = eb.student_id
     WHERE eb.id = ?`,
    [id]
  );
  if (!batchRes.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 });
  const { student_id, semester } = batchRes.rows[0];
  const { student, subjects } = await listEligibleSubjects(student_id, semester, { includeAdvanced });
  const currentYearLevel = Number(student.year_level || 0);
  const regular = subjects.filter((subject) =>
    !subject.is_retake &&
    !subject.is_advanced &&
    Number(subject.year_level || 0) === currentYearLevel
  );
  const retakes = subjects.filter((subject) => subject.is_retake && !subject.is_advanced);
  const advanced = subjects.filter((subject) => subject.is_advanced);

  return {
    regular,
    retakes,
    advanced,
  };
}

async function getCreditableSubjects(batchId) {
  const batchRes = await query(
    `SELECT eb.id, eb.student_id, eb.school_year, eb.semester,
            s.course, s.year_level, s.enrollment_type
     FROM enrollment_batches eb
     JOIN students s ON s.id = eb.student_id
     WHERE eb.id = ?`,
    [batchId]
  );
  if (!batchRes.rows.length) throw Object.assign(new Error('Batch not found'), { status: 404 });
  const { student_id, course } = batchRes.rows[0];

  // Get subjects already passed by the student
  const passedSubjectIds = await getPassedSubjectIds(student_id);

  // Return all subjects for the student's course (any year level, any semester)
  const { rows } = await query(
    `SELECT s.id, s.code, s.name, s.units, s.year_level, s.semester, s.course
     FROM subjects s
     WHERE s.course = ?
     ORDER BY s.year_level, s.semester, s.code`,
    [course]
  );

  // Exclude already-passed subjects
  return rows.filter((s) => !passedSubjectIds.has(s.id));
}

async function getPreEnrollmentSubjects(student_id) {
  const activeTerm = await academicSettingsService.getRequiredActive();
  const { student, subjects } = await listEligibleSubjects(student_id, activeTerm.semester);
  const currentYearLevel = Number(student.year_level || 0);
  const regular = subjects.filter((subject) => !subject.is_retake && Number(subject.year_level || 0) === currentYearLevel);
  const retakes = subjects.filter((subject) => !regular.includes(subject));

  return {
    school_year: activeTerm.school_year,
    semester: activeTerm.semester,
    regular,
    retakes,
  };
}

module.exports = { list, getById, create, submitForEvaluation, evaluate, approve, register, remove, listUnenrolled, listCourses, listAssessments, getAvailableSubjects, getPreEnrollmentSubjects, getCreditableSubjects };
