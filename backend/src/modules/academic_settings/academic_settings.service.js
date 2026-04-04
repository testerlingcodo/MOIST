'use strict';

const { query, newId } = require('../../config/db');

async function list() {
  const res = await query(
    `SELECT a.*,
            EXISTS(
              SELECT 1
              FROM enrollment_batches eb
              WHERE eb.school_year = a.school_year
                AND eb.semester = a.semester
              LIMIT 1
            ) AS has_history
     FROM academic_settings a
     ORDER BY a.created_at DESC`
  );

  return res.rows.map((row) => ({
    ...row,
    has_history: Boolean(row.has_history),
    can_activate: Boolean(row.is_active) || !Boolean(row.has_history),
  }));
}

async function getActive() {
  const res = await query(
    'SELECT * FROM academic_settings WHERE is_active = 1 LIMIT 1'
  );
  return res.rows[0] || null;
}

async function getRequiredActive() {
  const active = await getActive();
  if (!active) {
    throw Object.assign(new Error('No active academic term is configured'), { status: 422 });
  }
  return active;
}

async function assertActiveTermMatch(school_year, semester, label = 'Record') {
  const active = await getRequiredActive();
  if (active.school_year !== school_year || active.semester !== semester) {
    throw Object.assign(
      new Error(`${label} is only allowed for the currently active term (${active.school_year} ${active.semester} semester)`),
      { status: 409 }
    );
  }
  return active;
}

async function create({ school_year, semester, label, created_by }) {
  if (!school_year || !semester) {
    throw Object.assign(new Error('school_year and semester are required'), { status: 400 });
  }

  const existing = await query(
    'SELECT id FROM academic_settings WHERE school_year = ? AND semester = ?',
    [school_year, semester]
  );
  if (existing.rows.length) {
    throw Object.assign(
      new Error(`${school_year} ${semester} semester already exists`),
      { status: 409 }
    );
  }

  const id = newId();
  await query(
    `INSERT INTO academic_settings (id, school_year, semester, label, is_active, created_by)
     VALUES (?, ?, ?, ?, 0, ?)`,
    [id, school_year, semester, label || null, created_by || null]
  );

  const res = await query('SELECT * FROM academic_settings WHERE id = ?', [id]);
  return res.rows[0];
}

async function setActive(id) {
  const res = await query('SELECT * FROM academic_settings WHERE id = ?', [id]);
  if (!res.rows.length) {
    throw Object.assign(new Error('Academic setting not found'), { status: 404 });
  }

  const target = res.rows[0];
  const { rows: historyRows } = await query(
    `SELECT EXISTS(
       SELECT 1
       FROM enrollment_batches
       WHERE school_year = ? AND semester = ?
       LIMIT 1
     ) AS has_history`,
    [target.school_year, target.semester]
  );
  const hasHistory = Boolean(historyRows[0]?.has_history);

  if (!target.is_active && hasHistory) {
    throw Object.assign(
      new Error('This academic term already has historical records and can no longer be reactivated'),
      { status: 409 }
    );
  }

  await query('UPDATE academic_settings SET is_active = 0');
  await query('UPDATE academic_settings SET is_active = 1 WHERE id = ?', [id]);

  const updated = await query('SELECT * FROM academic_settings WHERE id = ?', [id]);
  return updated.rows[0];
}

async function remove(id) {
  const res = await query('SELECT * FROM academic_settings WHERE id = ?', [id]);
  if (!res.rows.length) {
    throw Object.assign(new Error('Academic setting not found'), { status: 404 });
  }
  if (res.rows[0].is_active) {
    throw Object.assign(new Error('Cannot delete the active academic setting'), { status: 422 });
  }

  const { rows: historyRows } = await query(
    `SELECT EXISTS(
       SELECT 1
       FROM enrollment_batches
       WHERE school_year = ? AND semester = ?
       LIMIT 1
     ) AS has_history`,
    [res.rows[0].school_year, res.rows[0].semester]
  );
  if (Boolean(historyRows[0]?.has_history)) {
    throw Object.assign(new Error('Cannot delete an academic term that already has historical records'), { status: 409 });
  }
  await query('DELETE FROM academic_settings WHERE id = ?', [id]);
}

module.exports = { list, getActive, getRequiredActive, assertActiveTermMatch, create, setActive, remove };
