'use strict';
require('dotenv').config();
const { query, pool } = require('../src/config/db');

const DAYS_MWF  = ['MWF', 'MWF', 'MWF', 'M/W/F'];
const DAYS_TTH  = ['TTh', 'TTh', 'T/Th'];
const DAYS_SAT  = ['Sat'];

// Start times (hour, minute)
const STARTS_MWF = [
  [7,0],[8,0],[9,0],[10,0],[11,0],[13,0],[14,0],[15,0],[16,0],
];
const STARTS_TTH = [
  [7,0],[7,30],[8,0],[8,30],[9,0],[9,30],[10,0],[10,30],
  [13,0],[13,30],[14,0],[14,30],[15,0],[15,30],
];

const ROOMS = [
  'RM-101','RM-102','RM-103','RM-104','RM-105',
  'RM-201','RM-202','RM-203','RM-204','RM-205',
  'LAB-101','LAB-102','LAB-103',
  'AVR-1','LIB-2',
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function pad(n) { return String(n).padStart(2, '0'); }

function toTimeStr(h, m) { return `${pad(h)}:${pad(m)}:00`; }

function addMinutes(h, m, mins) {
  const total = h * 60 + m + mins;
  return [Math.floor(total / 60) % 24, total % 60];
}

function randomSchedule() {
  const type = Math.random() < 0.55 ? 'MWF' : (Math.random() < 0.85 ? 'TTh' : 'Sat');

  let days, start, duration;

  if (type === 'MWF') {
    days = pick(DAYS_MWF);
    start = pick(STARTS_MWF);
    duration = 60;
  } else if (type === 'TTh') {
    days = pick(DAYS_TTH);
    start = pick(STARTS_TTH);
    duration = 90;
  } else {
    days = pick(DAYS_SAT);
    start = pick(STARTS_TTH);
    duration = 180;
  }

  const sh = start[0], sm = start[1];

  const [eh, em] = addMinutes(sh, sm, duration);

  return {
    schedule_days: days,
    start_time: toTimeStr(sh, sm),
    end_time: toTimeStr(eh, em),
    room: pick(ROOMS),
  };
}

async function main() {
  const { rows } = await query('SELECT id FROM subjects');
  console.log(`Assigning random schedules to ${rows.length} subjects...`);

  for (const { id } of rows) {
    const { schedule_days, start_time, end_time, room } = randomSchedule();
    await query(
      `UPDATE subjects SET schedule_days=?, start_time=?, end_time=?, room=? WHERE id=?`,
      [schedule_days, start_time, end_time, room, id]
    );
  }

  console.log('Done!');
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
