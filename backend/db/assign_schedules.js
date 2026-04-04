/**
 * Assigns random rooms, days, and time slots to all subjects.
 * - MWF subjects get 1-hour slots  (3 × 1hr  = 3 units)
 * - TTh  subjects get 1.5-hour slots (2 × 1.5hr = 3 units)
 * - 6-unit subjects (OJT/internship/practicum) get no schedule
 * Run: node db/assign_schedules.js
 */

require('dotenv').config();
const { pool } = require('../src/config/db');

// ── Rooms ───────────────────────────────────────────────────────────────────
const REGULAR_ROOMS = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105',
  'Room 106', 'Room 107', 'Room 108',
  'Room 201', 'Room 202', 'Room 203', 'Room 204', 'Room 205',
  'Room 206', 'Room 207',
  'Room 301', 'Room 302', 'Room 303', 'Room 304',
  'Lecture Hall A', 'Lecture Hall B',
];

const LAB_ROOMS = [
  'Computer Lab 1', 'Computer Lab 2', 'Computer Lab 3',
  'Science Lab 1', 'Science Lab 2',
  'Engineering Lab 1', 'Engineering Lab 2',
  'Maritime Lab', 'CAD Lab',
];

// Keywords that suggest a subject should be in a lab
const LAB_KEYWORDS = [
  'lab', 'computer', 'programming', 'computing', 'cad', 'database',
  'web', 'mobile', 'network', 'system', 'software', 'workshop',
  'drawing', 'practicum', 'ojt', 'internship', 'navigation',
  'simulator', 'chemistry', 'physics', 'engineering lab',
];

function pickRoom(subject) {
  const nameLower = (subject.name || '').toLowerCase();
  const codeLower = (subject.code || '').toLowerCase();
  const isLab = LAB_KEYWORDS.some((kw) => nameLower.includes(kw) || codeLower.includes(kw));
  const pool = isLab ? LAB_ROOMS : REGULAR_ROOMS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Time slots ──────────────────────────────────────────────────────────────
// MWF: 1-hour blocks
const MWF_SLOTS = [
  { start: '07:00:00', end: '08:00:00' },
  { start: '08:00:00', end: '09:00:00' },
  { start: '09:00:00', end: '10:00:00' },
  { start: '10:00:00', end: '11:00:00' },
  { start: '11:00:00', end: '12:00:00' },
  { start: '13:00:00', end: '14:00:00' },
  { start: '14:00:00', end: '15:00:00' },
  { start: '15:00:00', end: '16:00:00' },
  { start: '16:00:00', end: '17:00:00' },
];

// TTh: 1.5-hour blocks
const TTH_SLOTS = [
  { start: '07:00:00', end: '08:30:00' },
  { start: '08:30:00', end: '10:00:00' },
  { start: '10:00:00', end: '11:30:00' },
  { start: '11:30:00', end: '13:00:00' },
  { start: '13:00:00', end: '14:30:00' },
  { start: '14:30:00', end: '16:00:00' },
  { start: '16:00:00', end: '17:30:00' },
];

const DAY_PATTERNS = ['MWF', 'TTh'];

function pickSchedule() {
  const days = DAY_PATTERNS[Math.floor(Math.random() * DAY_PATTERNS.length)];
  const slots = days === 'MWF' ? MWF_SLOTS : TTH_SLOTS;
  const slot = slots[Math.floor(Math.random() * slots.length)];
  return { days, start: slot.start, end: slot.end };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function run() {
  const [rows] = await pool.query(
    `SELECT id, code, name, units FROM subjects WHERE is_active = 1 ORDER BY id`
  );

  console.log(`Assigning schedules to ${rows.length} subjects...`);

  let updated = 0;
  let skipped = 0;

  for (const subject of rows) {
    // Skip 6-unit subjects (OJT, internship, practicum, student teaching)
    if (Number(subject.units) >= 6) {
      skipped++;
      continue;
    }

    const room = pickRoom(subject);
    const { days, start, end } = pickSchedule();

    await pool.execute(
      `UPDATE subjects SET schedule_days = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?`,
      [days, start, end, room, subject.id]
    );
    updated++;
  }

  console.log(`Done. Updated: ${updated} | Skipped (OJT/6-unit): ${skipped}`);
  await pool.end();
}

run().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
