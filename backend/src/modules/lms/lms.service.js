const { query, newId } = require('../../config/db');
const academicSettingsService = require('../academic_settings/academic_settings.service');

const INSTRUCTOR_ROLES = new Set(['admin', 'teacher']);

function isInstructor(role) {
  return INSTRUCTOR_ROLES.has(role);
}

function toBool(v) {
  return v === true || v === 1 || v === '1' || v === 'true';
}

async function getStudentByUserId(userId) {
  const { rows } = await query('SELECT id, student_number, first_name, last_name FROM students WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) throw Object.assign(new Error('Student profile not found'), { status: 404 });
  return rows[0];
}

async function getTeacherByUserId(userId) {
  const { rows } = await query('SELECT id, user_id, first_name, last_name FROM teachers WHERE user_id = ? LIMIT 1', [userId]);
  if (!rows[0]) throw Object.assign(new Error('Teacher profile not found'), { status: 404 });
  return rows[0];
}

async function assertSubjectInstructor(subjectId, user) {
  if (user.role === 'admin') return true;
  if (!isInstructor(user.role)) throw Object.assign(new Error('Instructor access only'), { status: 403 });
  const teacher = await getTeacherByUserId(user.sub);
  const { rows } = await query('SELECT id FROM subjects WHERE id = ? AND teacher_id = ? LIMIT 1', [subjectId, teacher.id]);
  if (!rows[0]) throw Object.assign(new Error('Forbidden: instructor access only'), { status: 403 });
  return true;
}

async function assertStudentEnrolledInSubject(subjectId, user) {
  const student = await getStudentByUserId(user.sub);
  const active = await academicSettingsService.getActive();
  const conditions = ['e.student_id = ?', 'e.subject_id = ?', "e.status = 'enrolled'"];
  const params = [student.id, subjectId];
  if (active) {
    conditions.push('e.school_year = ?');
    params.push(active.school_year);
    conditions.push('e.semester = ?');
    params.push(active.semester);
  }
  const where = conditions.join(' AND ');
  const { rows } = await query(`SELECT e.id FROM enrollments e WHERE ${where} LIMIT 1`, params);
  if (!rows[0]) throw Object.assign(new Error('Not enrolled in this subject'), { status: 403 });
  return student;
}

async function getCourseOrThrow(courseId) {
  const { rows } = await query('SELECT * FROM lms_courses WHERE id = ? LIMIT 1', [courseId]);
  if (!rows[0]) throw Object.assign(new Error('Course not found'), { status: 404 });
  return rows[0];
}

async function assertCourseInstructor(courseId, user) {
  const course = await getCourseOrThrow(courseId);
  if (user.role === 'admin') return course;
  if (!isInstructor(user.role) || course.instructor_user_id !== user.sub) {
    throw Object.assign(new Error('Forbidden: instructor access only'), { status: 403 });
  }
  return course;
}

function parseJson(v, fallback = null) {
  if (!v) return fallback;
  try { return typeof v === 'string' ? JSON.parse(v) : v; } catch (_) { return fallback; }
}

function autoCheckQuestion(question, answerRaw) {
  const answer = (answerRaw ?? '').toString().trim().toLowerCase();
  const correct = (question.correct_answer ?? '').toString().trim().toLowerCase();
  const type = (question.question_type ?? '').toLowerCase();
  if (type === 'essay') return { earned: null, autoChecked: false };
  return { earned: answer === correct ? Number(question.points || 1) : 0, autoChecked: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Subject-based LMS (v2)
// ─────────────────────────────────────────────────────────────────────────────

async function listMySubjects(user) {
  const active = await academicSettingsService.getActive();

  if (isInstructor(user.role)) {
    const teacher = await getTeacherByUserId(user.sub);
    const conditions = ['s.teacher_id = ?', 's.is_active = 1'];
    const params = [teacher.id];
    if (active) {
      conditions.push('s.semester = ?');
      params.push(active.semester);
    }
    const where = conditions.join(' AND ');
    const { rows } = await query(
      `SELECT s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
              s.course, s.year_level, s.semester, s.section_name,
              t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
       FROM subjects s
       LEFT JOIN teachers t ON t.id = s.teacher_id
       WHERE ${where}
       ORDER BY s.code`,
      params
    );
    return rows;
  }

  const student = await getStudentByUserId(user.sub);
  const conditions = ['e.student_id = ?', "e.status = 'enrolled'"];
  const params = [student.id];
  if (active) {
    conditions.push('e.school_year = ?');
    params.push(active.school_year);
    conditions.push('e.semester = ?');
    params.push(active.semester);
  }
  const where = conditions.join(' AND ');
  const { rows } = await query(
    `SELECT s.id AS subject_id, s.code AS subject_code, s.name AS subject_name,
            s.course, s.year_level, s.semester, s.section_name,
            t.first_name AS teacher_first_name, t.last_name AS teacher_last_name
     FROM enrollments e
     JOIN subjects s ON s.id = e.subject_id
     LEFT JOIN teachers t ON t.id = s.teacher_id
     WHERE ${where}
     ORDER BY s.code`,
    params
  );
  return rows;
}

async function listSubjectLessons(subjectId, user) {
  const { rows: sr } = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!sr[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });

  if (isInstructor(user.role)) {
    await assertSubjectInstructor(subjectId, user);
    const { rows } = await query(
      'SELECT * FROM lms_subject_lessons WHERE subject_id = ? ORDER BY position, created_at',
      [subjectId]
    );
    return rows;
  }

  await assertStudentEnrolledInSubject(subjectId, user);
  const { rows } = await query(
    'SELECT * FROM lms_subject_lessons WHERE subject_id = ? AND is_published = 1 ORDER BY position, created_at',
    [subjectId]
  );
  return rows;
}

async function createSubjectLesson(subjectId, user, payload) {
  await assertSubjectInstructor(subjectId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_subject_lessons
     (id, subject_id, title, description, content_type, content_url, module_type, module_url, position, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subjectId,
      payload.title,
      payload.description || null,
      payload.content_type || 'video',
      payload.content_url || null,
      payload.module_type || null,
      payload.module_url || null,
      Number(payload.position || 1),
      toBool(payload.is_published) ? 1 : 0,
    ]
  );
  const { rows } = await query('SELECT * FROM lms_subject_lessons WHERE id = ?', [id]);
  return rows[0];
}

async function listSubjectAssignments(subjectId, user) {
  const { rows: sr } = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!sr[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });

  if (isInstructor(user.role)) {
    await assertSubjectInstructor(subjectId, user);
    const { rows } = await query(
      'SELECT * FROM lms_subject_assignments WHERE subject_id = ? ORDER BY created_at DESC',
      [subjectId]
    );
    return rows;
  }
  await assertStudentEnrolledInSubject(subjectId, user);
  const { rows } = await query(
    'SELECT * FROM lms_subject_assignments WHERE subject_id = ? AND is_published = 1 ORDER BY created_at DESC',
    [subjectId]
  );
  return rows;
}

async function createSubjectAssignment(subjectId, user, payload) {
  await assertSubjectInstructor(subjectId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_subject_assignments
     (id, subject_id, title, instructions, due_at, max_score, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subjectId,
      payload.title,
      payload.instructions || null,
      payload.due_at || null,
      Number(payload.max_score || 100),
      toBool(payload.is_published) ? 1 : 0,
    ]
  );
  const { rows } = await query('SELECT * FROM lms_subject_assignments WHERE id = ?', [id]);
  return rows[0];
}

async function submitSubjectAssignment(assignmentId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: aRows } = await query(
    `SELECT a.*, a.subject_id
     FROM lms_subject_assignments a
     WHERE a.id = ?`,
    [assignmentId]
  );
  const assignment = aRows[0];
  if (!assignment) throw Object.assign(new Error('Assignment not found'), { status: 404 });
  await assertStudentEnrolledInSubject(assignment.subject_id, user);

  const id = newId();
  await query(
    `INSERT INTO lms_subject_assignment_submissions
     (id, assignment_id, student_id, content_text, content_url, status)
     VALUES (?, ?, ?, ?, ?, 'submitted')
     ON DUPLICATE KEY UPDATE content_text = VALUES(content_text), content_url = VALUES(content_url), submitted_at = CURRENT_TIMESTAMP, status = 'submitted'`,
    [id, assignment.id, student.id, payload.content_text || null, payload.content_url || null]
  );
  const { rows } = await query(
    'SELECT * FROM lms_subject_assignment_submissions WHERE assignment_id = ? AND student_id = ?',
    [assignment.id, student.id]
  );
  return rows[0];
}

async function listSubjectQuizzes(subjectId, user) {
  const { rows: sr } = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!sr[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });

  if (isInstructor(user.role)) {
    await assertSubjectInstructor(subjectId, user);
    const { rows } = await query(
      'SELECT * FROM lms_subject_quizzes WHERE subject_id = ? ORDER BY created_at DESC',
      [subjectId]
    );
    return rows;
  }
  await assertStudentEnrolledInSubject(subjectId, user);
  const { rows } = await query(
    'SELECT * FROM lms_subject_quizzes WHERE subject_id = ? AND is_published = 1 ORDER BY created_at DESC',
    [subjectId]
  );
  return rows;
}

async function createSubjectQuiz(subjectId, user, payload) {
  await assertSubjectInstructor(subjectId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_subject_quizzes
     (id, subject_id, title, time_limit_minutes, attempts_allowed, passing_score, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subjectId,
      payload.title,
      payload.time_limit_minutes !== undefined ? Number(payload.time_limit_minutes) : null,
      Number(payload.attempts_allowed || 1),
      Number(payload.passing_score || 60),
      toBool(payload.is_published) ? 1 : 0,
    ]
  );

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] || {};
    await query(
      `INSERT INTO lms_subject_quiz_questions
       (id, quiz_id, question_type, question_text, choices_json, correct_answer, points, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        id,
        q.question_type || 'multiple_choice',
        q.question_text || '',
        q.choices_json ? JSON.stringify(q.choices_json) : (q.choices ? JSON.stringify(q.choices) : null),
        q.correct_answer || null,
        Number(q.points || 1),
        Number(q.position || (i + 1)),
      ]
    );
  }

  const { rows } = await query('SELECT * FROM lms_subject_quizzes WHERE id = ?', [id]);
  return rows[0];
}

async function submitSubjectQuiz(quizId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: qRows } = await query('SELECT * FROM lms_subject_quizzes WHERE id = ? LIMIT 1', [quizId]);
  const quiz = qRows[0];
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { status: 404 });
  await assertStudentEnrolledInSubject(quiz.subject_id, user);

  const { rows: qq } = await query('SELECT * FROM lms_subject_quiz_questions WHERE quiz_id = ? ORDER BY position, created_at', [quizId]);
  const answers = payload.answers || {};
  let score = 0;
  for (const question of qq) {
    const { earned } = autoCheckQuestion(question, answers[question.id]);
    score += earned === null ? 0 : earned;
  }
  const passed = score >= Number(quiz.passing_score || 60);
  const attemptNo = Number(payload.attempt_no || 1);
  const id = newId();
  await query(
    `INSERT INTO lms_subject_quiz_attempts
     (id, quiz_id, student_id, attempt_no, answers_json, score, passed, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, quizId, student.id, attemptNo, JSON.stringify(answers), score, passed ? 1 : 0]
  );
  const { rows } = await query('SELECT * FROM lms_subject_quiz_attempts WHERE id = ?', [id]);
  return rows[0];
}

async function listSubjectExams(subjectId, user) {
  const { rows: sr } = await query('SELECT id FROM subjects WHERE id = ? LIMIT 1', [subjectId]);
  if (!sr[0]) throw Object.assign(new Error('Subject not found'), { status: 404 });

  if (isInstructor(user.role)) {
    await assertSubjectInstructor(subjectId, user);
    const { rows } = await query(
      'SELECT * FROM lms_subject_exams WHERE subject_id = ? ORDER BY created_at DESC',
      [subjectId]
    );
    return rows;
  }
  await assertStudentEnrolledInSubject(subjectId, user);
  const { rows } = await query(
    'SELECT * FROM lms_subject_exams WHERE subject_id = ? AND is_published = 1 ORDER BY created_at DESC',
    [subjectId]
  );
  return rows;
}

async function createSubjectExam(subjectId, user, payload) {
  await assertSubjectInstructor(subjectId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_subject_exams
     (id, subject_id, title, description, start_at, end_at, duration_minutes, attempts_allowed, passing_score,
      shuffle_questions, shuffle_choices, timer_enabled, allow_late_join, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      subjectId,
      payload.title,
      payload.description || null,
      payload.start_at || null,
      payload.end_at || null,
      payload.duration_minutes !== undefined ? Number(payload.duration_minutes) : null,
      Number(payload.attempts_allowed || 1),
      Number(payload.passing_score || 60),
      toBool(payload.shuffle_questions) ? 1 : 0,
      toBool(payload.shuffle_choices) ? 1 : 0,
      toBool(payload.timer_enabled) ? 1 : 0,
      toBool(payload.allow_late_join) ? 1 : 0,
      toBool(payload.is_published) ? 1 : 0,
    ]
  );

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] || {};
    await query(
      `INSERT INTO lms_subject_exam_questions
       (id, exam_id, question_type, question_text, choices_json, correct_answer, points, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        id,
        q.question_type || 'multiple_choice',
        q.question_text || '',
        q.choices_json ? JSON.stringify(q.choices_json) : (q.choices ? JSON.stringify(q.choices) : null),
        q.correct_answer || null,
        Number(q.points || 1),
        Number(q.position || (i + 1)),
      ]
    );
  }

  const { rows } = await query('SELECT * FROM lms_subject_exams WHERE id = ?', [id]);
  return rows[0];
}

async function _getLatestSubjectExamSession(examId) {
  const { rows } = await query(
    "SELECT * FROM lms_subject_exam_sessions WHERE exam_id = ? AND status IN ('waiting','live') ORDER BY created_at DESC LIMIT 1",
    [examId]
  );
  return rows[0] || null;
}

async function openSubjectExamSession(examId, user) {
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  await assertSubjectInstructor(exam.subject_id, user);

  // End any existing session (waiting/live)
  await query(
    "UPDATE lms_subject_exam_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE exam_id = ? AND status IN ('waiting','live')",
    [examId]
  );

  const id = newId();
  await query(
    `INSERT INTO lms_subject_exam_sessions (id, exam_id, host_user_id, status, started_at)
     VALUES (?, ?, ?, 'waiting', NULL)`,
    [id, examId, user.sub]
  );

  const { rows } = await query('SELECT * FROM lms_subject_exam_sessions WHERE id = ?', [id]);
  return rows[0];
}

async function startSubjectExamSession(examId, user) {
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  await assertSubjectInstructor(exam.subject_id, user);

  let session = await _getLatestSubjectExamSession(examId);
  if (!session) {
    session = await openSubjectExamSession(examId, user);
  }

  if (session.status === 'live') return session;

  await query(
    `UPDATE lms_subject_exam_sessions
     SET status = 'live', started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
     WHERE id = ?`,
    [session.id]
  );

  const { rows } = await query('SELECT * FROM lms_subject_exam_sessions WHERE id = ?', [session.id]);
  return rows[0];
}

async function stopSubjectExamSession(examId, user) {
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  await assertSubjectInstructor(exam.subject_id, user);

  const session = await _getLatestSubjectExamSession(examId);
  if (!session) throw Object.assign(new Error('No active session found'), { status: 400 });

  await query(
    `UPDATE lms_subject_exam_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [session.id]
  );
  await query(
    `UPDATE lms_subject_exam_participants
     SET status = 'auto_submitted', submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP), is_online = 0
     WHERE session_id = ? AND status IN ('in_progress','waiting')`,
    [session.id]
  );
  return { success: true };
}

async function getLiveSubjectExamSession(examId, user) {
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  // Authorization: teacher of the subject or enrolled student can view
  if (isInstructor(user.role)) {
    await assertSubjectInstructor(exam.subject_id, user);
  } else {
    await assertStudentEnrolledInSubject(exam.subject_id, user);
  }

  const session = await _getLatestSubjectExamSession(examId);
  if (!session) return { live: false, status: 'none' };

  const { rows: participants } = await query(
    `SELECT p.*, s.student_number, s.first_name, s.last_name
     FROM lms_subject_exam_participants p
     JOIN students s ON s.id = p.student_id
     WHERE p.session_id = ?
     ORDER BY p.created_at`,
    [session.id]
  );
  return {
    live: session.status === 'live',
    status: session.status,
    session,
    participants,
  };
}

async function joinSubjectExam(examId, user) {
  const student = await getStudentByUserId(user.sub);
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  await assertStudentEnrolledInSubject(exam.subject_id, user);

  const session = await _getLatestSubjectExamSession(examId);
  if (!session) throw Object.assign(new Error('Exam is not open'), { status: 400 });

  // Late join gate only applies once live
  if (session.status === 'live' && !toBool(exam.allow_late_join) && session.started_at) {
    // If late join is disabled, allow join only within first 1 minute (simple rule)
    const { rows: timeRows } = await query('SELECT TIMESTAMPDIFF(SECOND, ?, NOW()) AS diff', [session.started_at]);
    const diff = Number(timeRows[0]?.diff || 0);
    if (diff > 60) throw Object.assign(new Error('Late join is disabled'), { status: 403 });
  }

  await query(
    `INSERT INTO lms_subject_exam_participants
     (id, session_id, student_id, status, started_at, last_seen_at, is_online)
     VALUES (?, ?, ?, ?, NULL, CURRENT_TIMESTAMP, 1)
     ON DUPLICATE KEY UPDATE last_seen_at = CURRENT_TIMESTAMP, is_online = 1`,
    [newId(), session.id, student.id, session.status === 'live' ? 'in_progress' : 'waiting']
  );

  const { rows } = await query('SELECT * FROM lms_subject_exam_participants WHERE session_id = ? AND student_id = ?', [session.id, student.id]);
  return { session, participant: rows[0] };
}

async function heartbeatSubjectExam(examId, user) {
  const student = await getStudentByUserId(user.sub);
  const session = await _getLatestSubjectExamSession(examId);
  if (!session) throw Object.assign(new Error('Exam is not open'), { status: 400 });
  await query(
    'UPDATE lms_subject_exam_participants SET last_seen_at = CURRENT_TIMESTAMP, is_online = 1 WHERE session_id = ? AND student_id = ?',
    [session.id, student.id]
  );
  return { success: true };
}

async function submitSubjectExam(examId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  await assertStudentEnrolledInSubject(exam.subject_id, user);

  const session = await _getLatestSubjectExamSession(examId);
  if (!session || session.status !== 'live') throw Object.assign(new Error('Exam has not started'), { status: 400 });

  const { rows: participantRows } = await query('SELECT * FROM lms_subject_exam_participants WHERE session_id = ? AND student_id = ? LIMIT 1', [session.id, student.id]);
  if (!participantRows[0]) throw Object.assign(new Error('Join exam before submitting'), { status: 400 });

  const { rows: questionRows } = await query('SELECT * FROM lms_subject_exam_questions WHERE exam_id = ? ORDER BY position, created_at', [examId]);
  const answers = payload.answers || {};
  let autoScore = 0;
  let manualNeeded = false;
  for (const q of questionRows) {
    const result = autoCheckQuestion(q, answers[q.id]);
    if (result.earned == null) manualNeeded = true;
    if (result.earned != null) autoScore += result.earned;
  }

  await query(
    `UPDATE lms_subject_exam_participants
     SET answers_json = ?, auto_score = ?, status = ?, submitted_at = CURRENT_TIMESTAMP, is_online = 0
     WHERE session_id = ? AND student_id = ?`,
    [JSON.stringify(answers), autoScore, manualNeeded ? 'submitted_pending_review' : 'submitted', session.id, student.id]
  );
  return { auto_score: autoScore, status: manualNeeded ? 'submitted_pending_review' : 'submitted' };
}

async function forceSubmitAllSubjectExam(examId, user) {
  const { rows: examRows } = await query('SELECT * FROM lms_subject_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  await assertSubjectInstructor(exam.subject_id, user);

  const session = await _getLatestSubjectExamSession(examId);
  if (!session || session.status !== 'live') throw Object.assign(new Error('No live session found'), { status: 400 });

  await query(
    `UPDATE lms_subject_exam_participants
     SET status = 'auto_submitted', submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP), is_online = 0
     WHERE session_id = ? AND status IN ('in_progress','waiting')`,
    [session.id]
  );
  await query(
    `UPDATE lms_subject_exam_sessions
     SET force_submitted_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [session.id]
  );
  return { success: true };
}

async function listCourses(user) {
  if (isInstructor(user.role)) {
    if (user.role === 'admin') {
      const { rows } = await query(
        `SELECT c.*, u.email AS instructor_email
         FROM lms_courses c
         JOIN users u ON u.id = c.instructor_user_id
         ORDER BY c.created_at DESC`
      );
      return rows;
    }
    const { rows } = await query(
      `SELECT c.*, u.email AS instructor_email
       FROM lms_courses c
       JOIN users u ON u.id = c.instructor_user_id
       WHERE c.instructor_user_id = ?
       ORDER BY c.created_at DESC`,
      [user.sub]
    );
    return rows;
  }

  const student = await getStudentByUserId(user.sub);
  const { rows } = await query(
    `SELECT c.*, ce.created_at AS enrolled_at, u.email AS instructor_email
     FROM lms_course_enrollments ce
     JOIN lms_courses c ON c.id = ce.course_id
     JOIN users u ON u.id = c.instructor_user_id
     WHERE ce.student_id = ? AND c.is_published = 1
     ORDER BY ce.created_at DESC`,
    [student.id]
  );
  return rows;
}

async function createCourse(user, payload) {
  if (!isInstructor(user.role)) throw Object.assign(new Error('Instructor access only'), { status: 403 });
  const title = (payload.title || '').trim();
  if (!title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_courses (id, code, title, description, instructor_user_id, is_published)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, payload.code || null, title, payload.description || null, payload.instructor_user_id || user.sub, toBool(payload.is_published) ? 1 : 0]
  );
  const { rows } = await query('SELECT * FROM lms_courses WHERE id = ?', [id]);
  return rows[0];
}

async function enrollStudent(courseId, user, studentId) {
  const course = await assertCourseInstructor(courseId, user);
  const targetStudentId = studentId || (await getStudentByUserId(user.sub)).id;
  await query(
    'INSERT IGNORE INTO lms_course_enrollments (id, course_id, student_id) VALUES (?, ?, ?)',
    [newId(), course.id, targetStudentId]
  );
  return { success: true };
}

async function listLessons(courseId, user) {
  await getCourseOrThrow(courseId);
  if (isInstructor(user.role)) {
    await assertCourseInstructor(courseId, user);
    const { rows } = await query('SELECT * FROM lms_lessons WHERE course_id = ? ORDER BY position, created_at', [courseId]);
    return rows;
  }
  const student = await getStudentByUserId(user.sub);
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [courseId, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });
  const { rows } = await query('SELECT * FROM lms_lessons WHERE course_id = ? AND is_published = 1 ORDER BY position, created_at', [courseId]);
  return rows;
}

async function createLesson(courseId, user, payload) {
  await assertCourseInstructor(courseId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_lessons
     (id, course_id, title, description, content_type, content_url, module_type, module_url, position, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      courseId,
      payload.title,
      payload.description || null,
      payload.content_type || 'video',
      payload.content_url || null,
      payload.module_type || null,
      payload.module_url || null,
      Number(payload.position || 1),
      toBool(payload.is_published) ? 1 : 0,
    ]
  );
  const { rows } = await query('SELECT * FROM lms_lessons WHERE id = ?', [id]);
  return rows[0];
}

async function createAssignment(courseId, user, payload) {
  await assertCourseInstructor(courseId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const id = newId();
  await query(
    `INSERT INTO lms_assignments (id, course_id, title, instructions, due_at, max_score, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, courseId, payload.title, payload.instructions || null, payload.due_at || null, Number(payload.max_score || 100), toBool(payload.is_published) ? 1 : 0]
  );
  const { rows } = await query('SELECT * FROM lms_assignments WHERE id = ?', [id]);
  return rows[0];
}

async function listAssignments(courseId, user) {
  await getCourseOrThrow(courseId);
  if (isInstructor(user.role)) {
    await assertCourseInstructor(courseId, user);
    const { rows } = await query('SELECT * FROM lms_assignments WHERE course_id = ? ORDER BY created_at DESC', [courseId]);
    return rows;
  }
  const student = await getStudentByUserId(user.sub);
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [courseId, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });
  const { rows } = await query('SELECT * FROM lms_assignments WHERE course_id = ? AND is_published = 1 ORDER BY created_at DESC', [courseId]);
  return rows;
}

async function submitAssignment(assignmentId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: aRows } = await query(
    `SELECT a.*, c.id AS course_id
     FROM lms_assignments a
     JOIN lms_courses c ON c.id = a.course_id
     WHERE a.id = ?`,
    [assignmentId]
  );
  const assignment = aRows[0];
  if (!assignment) throw Object.assign(new Error('Assignment not found'), { status: 404 });
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [assignment.course_id, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });

  const id = newId();
  await query(
    `INSERT INTO lms_assignment_submissions
     (id, assignment_id, student_id, content_text, content_url, status)
     VALUES (?, ?, ?, ?, ?, 'submitted')
     ON DUPLICATE KEY UPDATE content_text = VALUES(content_text), content_url = VALUES(content_url), submitted_at = CURRENT_TIMESTAMP, status = 'submitted'`,
    [id, assignment.id, student.id, payload.content_text || null, payload.content_url || null]
  );
  const { rows } = await query('SELECT * FROM lms_assignment_submissions WHERE assignment_id = ? AND student_id = ?', [assignment.id, student.id]);
  return rows[0];
}

async function createQuiz(courseId, user, payload) {
  await assertCourseInstructor(courseId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const quizId = newId();
  await query(
    `INSERT INTO lms_quizzes
     (id, course_id, title, description, time_limit_minutes, passing_score, attempts_allowed, shuffle_questions, shuffle_choices, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      quizId,
      courseId,
      payload.title,
      payload.description || null,
      payload.time_limit_minutes || null,
      Number(payload.passing_score || 60),
      Number(payload.attempts_allowed || 1),
      toBool(payload.shuffle_questions) ? 1 : 0,
      toBool(payload.shuffle_choices) ? 1 : 0,
      toBool(payload.is_published) ? 1 : 0,
    ]
  );

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    await query(
      `INSERT INTO lms_quiz_questions
       (id, quiz_id, question_text, question_type, choices_json, correct_answer, points, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), quizId, q.question_text, q.question_type || 'multiple_choice', JSON.stringify(q.choices || null), q.correct_answer ?? null, Number(q.points || 1), Number(q.position || i + 1)]
    );
  }
  const { rows } = await query('SELECT * FROM lms_quizzes WHERE id = ?', [quizId]);
  return rows[0];
}

async function listQuizzes(courseId, user) {
  await getCourseOrThrow(courseId);
  if (isInstructor(user.role)) {
    await assertCourseInstructor(courseId, user);
    const { rows } = await query('SELECT * FROM lms_quizzes WHERE course_id = ? ORDER BY created_at DESC', [courseId]);
    return rows;
  }
  const student = await getStudentByUserId(user.sub);
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [courseId, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });
  const { rows } = await query('SELECT * FROM lms_quizzes WHERE course_id = ? AND is_published = 1 ORDER BY created_at DESC', [courseId]);
  return rows;
}

async function submitQuiz(quizId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: quizRows } = await query('SELECT * FROM lms_quizzes WHERE id = ? LIMIT 1', [quizId]);
  const quiz = quizRows[0];
  if (!quiz) throw Object.assign(new Error('Quiz not found'), { status: 404 });
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [quiz.course_id, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });

  const { rows: countRows } = await query(
    "SELECT COUNT(*) AS c FROM lms_quiz_attempts WHERE quiz_id = ? AND student_id = ? AND status = 'submitted'",
    [quizId, student.id]
  );
  const attemptNo = Number(countRows[0].c) + 1;
  if (attemptNo > Number(quiz.attempts_allowed || 1)) {
    throw Object.assign(new Error('Maximum attempts reached'), { status: 400 });
  }

  const { rows: questionRows } = await query('SELECT * FROM lms_quiz_questions WHERE quiz_id = ? ORDER BY position, created_at', [quizId]);
  const answers = payload.answers || {};
  let score = 0;
  let maxScore = 0;
  for (const q of questionRows) {
    const points = Number(q.points || 1);
    maxScore += points;
    const result = autoCheckQuestion(q, answers[q.id]);
    if (result.earned != null) score += result.earned;
  }

  const id = newId();
  await query(
    `INSERT INTO lms_quiz_attempts
     (id, quiz_id, student_id, attempt_no, status, score, max_score, answers_json, submitted_at)
     VALUES (?, ?, ?, ?, 'submitted', ?, ?, ?, CURRENT_TIMESTAMP)`,
    [id, quizId, student.id, attemptNo, score, maxScore, JSON.stringify(answers)]
  );
  const passed = score >= Number(quiz.passing_score || 60);
  return { attempt_no: attemptNo, score, max_score: maxScore, passed };
}

async function createExam(courseId, user, payload) {
  await assertCourseInstructor(courseId, user);
  if (!payload.title) throw Object.assign(new Error('title is required'), { status: 400 });
  const examId = newId();
  await query(
    `INSERT INTO lms_exams
     (id, course_id, title, description, start_at, end_at, duration_minutes, timer_enabled, attempts_allowed, passing_score, shuffle_questions, shuffle_choices, allow_late_join, is_published)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      examId,
      courseId,
      payload.title,
      payload.description || null,
      payload.start_at || null,
      payload.end_at || null,
      payload.duration_minutes || null,
      toBool(payload.timer_enabled) ? 1 : 0,
      Number(payload.attempts_allowed || 1),
      Number(payload.passing_score || 60),
      toBool(payload.shuffle_questions) ? 1 : 0,
      toBool(payload.shuffle_choices) ? 1 : 0,
      toBool(payload.allow_late_join) ? 1 : 0,
      toBool(payload.is_published) ? 1 : 0,
    ]
  );

  const questions = Array.isArray(payload.questions) ? payload.questions : [];
  for (let i = 0; i < questions.length; i += 1) {
    const q = questions[i];
    await query(
      `INSERT INTO lms_exam_questions
       (id, exam_id, question_text, question_type, choices_json, correct_answer, points, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [newId(), examId, q.question_text, q.question_type || 'multiple_choice', JSON.stringify(q.choices || null), q.correct_answer ?? null, Number(q.points || 1), Number(q.position || i + 1)]
    );
  }

  const { rows } = await query('SELECT * FROM lms_exams WHERE id = ?', [examId]);
  return rows[0];
}

async function listExams(courseId, user) {
  await getCourseOrThrow(courseId);
  if (isInstructor(user.role)) {
    await assertCourseInstructor(courseId, user);
    const { rows } = await query('SELECT * FROM lms_exams WHERE course_id = ? ORDER BY created_at DESC', [courseId]);
    return rows;
  }
  const student = await getStudentByUserId(user.sub);
  const { rows: eRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [courseId, student.id]);
  if (!eRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });
  const { rows } = await query('SELECT * FROM lms_exams WHERE course_id = ? AND is_published = 1 ORDER BY created_at DESC', [courseId]);
  return rows;
}

async function startExamSession(examId, user) {
  const { rows: examRows } = await query(
    `SELECT e.*, c.instructor_user_id
     FROM lms_exams e
     JOIN lms_courses c ON c.id = e.course_id
     WHERE e.id = ?`,
    [examId]
  );
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  if (user.role !== 'admin' && exam.instructor_user_id !== user.sub) {
    throw Object.assign(new Error('Instructor access only'), { status: 403 });
  }

  await query("UPDATE lms_exam_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE exam_id = ? AND status = 'live'", [examId]);
  const sessionId = newId();
  await query(
    `INSERT INTO lms_exam_sessions (id, exam_id, host_user_id, status)
     VALUES (?, ?, ?, 'live')`,
    [sessionId, examId, user.sub]
  );
  return { session_id: sessionId, status: 'live' };
}

async function stopExamSession(examId, user) {
  const { rows: examRows } = await query(
    `SELECT e.*, c.instructor_user_id
     FROM lms_exams e
     JOIN lms_courses c ON c.id = e.course_id
     WHERE e.id = ?`,
    [examId]
  );
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  if (user.role !== 'admin' && exam.instructor_user_id !== user.sub) {
    throw Object.assign(new Error('Instructor access only'), { status: 403 });
  }
  await query("UPDATE lms_exam_sessions SET status = 'ended', ended_at = CURRENT_TIMESTAMP WHERE exam_id = ? AND status = 'live'", [examId]);
  await query("UPDATE lms_exam_participants p JOIN lms_exam_sessions s ON s.id = p.session_id SET p.status = 'auto_submitted', p.submitted_at = CURRENT_TIMESTAMP WHERE s.exam_id = ? AND p.status = 'in_progress'", [examId]);
  return { success: true };
}

async function getLiveExamSession(examId, user) {
  const { rows: sessionRows } = await query("SELECT * FROM lms_exam_sessions WHERE exam_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", [examId]);
  const session = sessionRows[0];
  if (!session) return { live: false };

  if (isInstructor(user.role)) {
    const { rows: participants } = await query(
      `SELECT p.*, s.student_number, s.first_name, s.last_name
       FROM lms_exam_participants p
       JOIN students s ON s.id = p.student_id
       WHERE p.session_id = ?
       ORDER BY p.joined_at`,
      [session.id]
    );
    return { live: true, session, participants };
  }

  const student = await getStudentByUserId(user.sub);
  const { rows } = await query('SELECT * FROM lms_exam_participants WHERE session_id = ? AND student_id = ? LIMIT 1', [session.id, student.id]);
  return { live: true, session, participant: rows[0] || null };
}

async function joinLiveExam(examId, user) {
  const student = await getStudentByUserId(user.sub);
  const { rows: examRows } = await query('SELECT * FROM lms_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  const { rows: enrollRows } = await query('SELECT id FROM lms_course_enrollments WHERE course_id = ? AND student_id = ?', [exam.course_id, student.id]);
  if (!enrollRows[0]) throw Object.assign(new Error('Not enrolled in this course'), { status: 403 });

  const { rows: sessionRows } = await query("SELECT * FROM lms_exam_sessions WHERE exam_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", [examId]);
  const session = sessionRows[0];
  if (!session) throw Object.assign(new Error('Exam is not currently live'), { status: 400 });

  const now = new Date();
  if (!toBool(exam.allow_late_join) && exam.start_at && now > new Date(exam.start_at)) {
    throw Object.assign(new Error('Late join is disabled for this exam'), { status: 400 });
  }

  await query(
    `INSERT INTO lms_exam_participants (id, session_id, student_id, is_online, status)
     VALUES (?, ?, ?, 1, 'in_progress')
     ON DUPLICATE KEY UPDATE is_online = 1, last_seen_at = CURRENT_TIMESTAMP`,
    [newId(), session.id, student.id]
  );
  const { rows } = await query('SELECT * FROM lms_exam_participants WHERE session_id = ? AND student_id = ?', [session.id, student.id]);
  return rows[0];
}

async function heartbeatExam(examId, user) {
  const student = await getStudentByUserId(user.sub);
  const { rows: sessionRows } = await query("SELECT id FROM lms_exam_sessions WHERE exam_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", [examId]);
  const session = sessionRows[0];
  if (!session) throw Object.assign(new Error('Exam is not live'), { status: 400 });
  await query(
    'UPDATE lms_exam_participants SET last_seen_at = CURRENT_TIMESTAMP, is_online = 1 WHERE session_id = ? AND student_id = ?',
    [session.id, student.id]
  );
  return { success: true };
}

async function submitLiveExam(examId, user, payload) {
  const student = await getStudentByUserId(user.sub);
  const { rows: examRows } = await query('SELECT * FROM lms_exams WHERE id = ? LIMIT 1', [examId]);
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });

  const { rows: sessionRows } = await query("SELECT * FROM lms_exam_sessions WHERE exam_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", [examId]);
  const session = sessionRows[0];
  if (!session) throw Object.assign(new Error('Exam is not live'), { status: 400 });

  const { rows: participantRows } = await query('SELECT * FROM lms_exam_participants WHERE session_id = ? AND student_id = ? LIMIT 1', [session.id, student.id]);
  if (!participantRows[0]) throw Object.assign(new Error('Join exam before submitting'), { status: 400 });

  const { rows: questionRows } = await query('SELECT * FROM lms_exam_questions WHERE exam_id = ? ORDER BY position, created_at', [examId]);
  const answers = payload.answers || {};
  let autoScore = 0;
  let manualNeeded = false;
  for (const q of questionRows) {
    const result = autoCheckQuestion(q, answers[q.id]);
    if (result.earned == null) manualNeeded = true;
    if (result.earned != null) autoScore += result.earned;
  }

  await query(
    `UPDATE lms_exam_participants
     SET answers_json = ?, auto_score = ?, status = ?, submitted_at = CURRENT_TIMESTAMP, is_online = 0
     WHERE session_id = ? AND student_id = ?`,
    [JSON.stringify(answers), autoScore, manualNeeded ? 'submitted_pending_review' : 'submitted', session.id, student.id]
  );
  return { auto_score: autoScore, status: manualNeeded ? 'submitted_pending_review' : 'submitted' };
}

async function forceSubmitAll(examId, user) {
  const { rows: examRows } = await query(
    `SELECT e.*, c.instructor_user_id
     FROM lms_exams e
     JOIN lms_courses c ON c.id = e.course_id
     WHERE e.id = ?`,
    [examId]
  );
  const exam = examRows[0];
  if (!exam) throw Object.assign(new Error('Exam not found'), { status: 404 });
  if (user.role !== 'admin' && exam.instructor_user_id !== user.sub) {
    throw Object.assign(new Error('Instructor access only'), { status: 403 });
  }

  const { rows: sessionRows } = await query("SELECT * FROM lms_exam_sessions WHERE exam_id = ? AND status = 'live' ORDER BY started_at DESC LIMIT 1", [examId]);
  const session = sessionRows[0];
  if (!session) throw Object.assign(new Error('No live session found'), { status: 400 });

  await query(
    `UPDATE lms_exam_participants
     SET status = 'auto_submitted', submitted_at = COALESCE(submitted_at, CURRENT_TIMESTAMP), is_online = 0
     WHERE session_id = ? AND status = 'in_progress'`,
    [session.id]
  );
  await query(
    `UPDATE lms_exam_sessions
     SET force_submitted_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [session.id]
  );
  return { success: true };
}

module.exports = {
  listCourses,
  createCourse,
  enrollStudent,
  listLessons,
  createLesson,
  listAssignments,
  createAssignment,
  submitAssignment,
  listQuizzes,
  createQuiz,
  submitQuiz,
  listExams,
  createExam,
  startExamSession,
  stopExamSession,
  getLiveExamSession,
  joinLiveExam,
  heartbeatExam,
  submitLiveExam,
  forceSubmitAll,
  parseJson,
  // v2
  listMySubjects,
  listSubjectLessons,
  createSubjectLesson,
  listSubjectAssignments,
  createSubjectAssignment,
  submitSubjectAssignment,
  listSubjectQuizzes,
  createSubjectQuiz,
  submitSubjectQuiz,
  listSubjectExams,
  createSubjectExam,
  openSubjectExamSession,
  startSubjectExamSession,
  stopSubjectExamSession,
  getLiveSubjectExamSession,
  joinSubjectExam,
  heartbeatSubjectExam,
  submitSubjectExam,
  forceSubmitAllSubjectExam,
};
