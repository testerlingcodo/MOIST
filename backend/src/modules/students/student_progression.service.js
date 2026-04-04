'use strict';

const { query } = require('../../config/db');

async function getStudent(studentId) {
  const { rows } = await query(
    'SELECT id, course, year_level FROM students WHERE id = ?',
    [studentId]
  );

  if (!rows[0]) {
    throw Object.assign(new Error('Student not found'), { status: 404 });
  }

  return rows[0];
}

async function syncStudentYearLevel(studentId) {
  const student = await getStudent(studentId);
  const currentYearLevel = Math.max(1, Number(student.year_level || 1));

  const { rows: subjectRows } = await query(
    `SELECT id, year_level
     FROM subjects
     WHERE course = ? AND is_minor = 0 AND year_level IS NOT NULL
     ORDER BY year_level, code`,
    [student.course]
  );

  if (!subjectRows.length) {
    return {
      studentId,
      course: student.course,
      previousYearLevel: currentYearLevel,
      yearLevel: currentYearLevel,
      changed: false,
    };
  }

  const majorSubjectsByYear = new Map();
  for (const row of subjectRows) {
    const yearLevel = Number(row.year_level || 0);
    if (!yearLevel) continue;
    if (!majorSubjectsByYear.has(yearLevel)) {
      majorSubjectsByYear.set(yearLevel, []);
    }
    majorSubjectsByYear.get(yearLevel).push(row.id);
  }

  const configuredYearLevels = Array.from(majorSubjectsByYear.keys()).sort((a, b) => a - b);
  const maxConfiguredYearLevel = configuredYearLevels[configuredYearLevels.length - 1];

  const { rows: passedRows } = await query(
    `SELECT DISTINCT e.subject_id
     FROM grades g
     JOIN enrollments e ON e.id = g.enrollment_id
     JOIN subjects sub ON sub.id = e.subject_id
     WHERE e.student_id = ?
       AND sub.course = ?
       AND sub.is_minor = 0
       AND g.final_status IN ('under_review', 'official')
       AND (g.remarks = 'passed' OR (g.final_grade IS NOT NULL AND g.final_grade + 0 <= 3.0))`,
    [studentId, student.course]
  );

  const passedSubjectIds = new Set(passedRows.map((row) => row.subject_id));

  let nextYearLevel = currentYearLevel;
  while (nextYearLevel < maxConfiguredYearLevel) {
    const subjectIds = majorSubjectsByYear.get(nextYearLevel) || [];
    if (!subjectIds.length) break;

    const completedCurrentYear = subjectIds.every((subjectId) => passedSubjectIds.has(subjectId));
    if (!completedCurrentYear) break;

    nextYearLevel += 1;
  }

  if (nextYearLevel > currentYearLevel) {
    await query(
      'UPDATE students SET year_level = ? WHERE id = ? AND year_level < ?',
      [nextYearLevel, studentId, nextYearLevel]
    );
  }

  return {
    studentId,
    course: student.course,
    previousYearLevel: currentYearLevel,
    yearLevel: nextYearLevel,
    changed: nextYearLevel > currentYearLevel,
  };
}

async function syncAllStudentYearLevels() {
  const { rows } = await query(
    `SELECT id
     FROM students
     WHERE course IS NOT NULL AND course != ''
     ORDER BY last_name, first_name, id`
  );

  const results = [];
  let changed = 0;

  for (const row of rows) {
    const result = await syncStudentYearLevel(row.id);
    results.push(result);
    if (result.changed) changed += 1;
  }

  return {
    total: rows.length,
    changed,
    unchanged: rows.length - changed,
    results,
  };
}

module.exports = {
  syncStudentYearLevel,
  syncAllStudentYearLevels,
};
