require('dotenv').config();
const { query, pool, newId } = require('../src/config/db');

const courseCatalog = {
  BSIT: {
    prefix: 'IT',
    room: 'LAB-IT',
    sem1: [
      { code: 'IT101', name: 'Introduction to Computing', units: 3 },
      { code: 'IT102', name: 'Computer Programming 1', units: 3 },
      { code: 'IT103', name: 'Human Computer Interaction', units: 3 },
      { code: 'IT104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'IT105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'IT111', name: 'Computer Programming 2', units: 3, prerequisite_code: 'IT102' },
      { code: 'IT112', name: 'Discrete Structures', units: 3, prerequisite_code: 'IT104' },
      { code: 'IT113', name: 'Web Systems and Technologies', units: 3, prerequisite_code: 'IT101' },
      { code: 'IT114', name: 'Readings in Philippine History', units: 3 },
      { code: 'IT115', name: 'Understanding the Self', units: 3 },
    ],
  },
  BSCS: {
    prefix: 'CS',
    room: 'LAB-CS',
    sem1: [
      { code: 'CS101', name: 'Introduction to Computer Science', units: 3 },
      { code: 'CS102', name: 'Programming Logic and Design', units: 3 },
      { code: 'CS103', name: 'Calculus for Computing', units: 3 },
      { code: 'CS104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'CS105', name: 'Communication Skills 1', units: 3 },
    ],
    sem2: [
      { code: 'CS111', name: 'Object-Oriented Programming', units: 3, prerequisite_code: 'CS102' },
      { code: 'CS112', name: 'Data Structures and Algorithms', units: 3, prerequisite_code: 'CS111' },
      { code: 'CS113', name: 'Discrete Mathematics', units: 3, prerequisite_code: 'CS103' },
      { code: 'CS114', name: 'Philippine History and Culture', units: 3 },
      { code: 'CS115', name: 'Communication Skills 2', units: 3, prerequisite_code: 'CS105' },
    ],
  },
  BSA: {
    prefix: 'AC',
    room: 'RM-ACC',
    sem1: [
      { code: 'AC101', name: 'Fundamentals of Accounting', units: 3 },
      { code: 'AC102', name: 'Business Mathematics', units: 3 },
      { code: 'AC103', name: 'Microeconomics', units: 3 },
      { code: 'AC104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'AC105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'AC111', name: 'Financial Accounting and Reporting', units: 3, prerequisite_code: 'AC101' },
      { code: 'AC112', name: 'Managerial Economics', units: 3, prerequisite_code: 'AC103' },
      { code: 'AC113', name: 'Business Law and Regulations', units: 3 },
      { code: 'AC114', name: 'Readings in Philippine History', units: 3 },
      { code: 'AC115', name: 'Science, Technology and Society', units: 3 },
    ],
  },
  BSED: {
    prefix: 'ED',
    room: 'RM-EDU',
    sem1: [
      { code: 'ED101', name: 'Foundations of Education', units: 3 },
      { code: 'ED102', name: 'Child and Adolescent Development', units: 3 },
      { code: 'ED103', name: 'Language, Culture and Society', units: 3 },
      { code: 'ED104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'ED105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'ED111', name: 'Principles of Teaching 1', units: 3, prerequisite_code: 'ED101' },
      { code: 'ED112', name: 'Assessment of Learning 1', units: 3, prerequisite_code: 'ED102' },
      { code: 'ED113', name: 'Facilitating Learner-Centered Teaching', units: 3 },
      { code: 'ED114', name: 'Understanding the Self', units: 3 },
      { code: 'ED115', name: 'Science, Technology and Society', units: 3 },
    ],
  },
  BSBA: {
    prefix: 'BA',
    room: 'RM-BUS',
    sem1: [
      { code: 'BA101', name: 'Introduction to Business Management', units: 3 },
      { code: 'BA102', name: 'Basic Finance', units: 3 },
      { code: 'BA103', name: 'Business Mathematics', units: 3 },
      { code: 'BA104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'BA105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'BA111', name: 'Marketing Management', units: 3, prerequisite_code: 'BA101' },
      { code: 'BA112', name: 'Human Resource Management', units: 3, prerequisite_code: 'BA101' },
      { code: 'BA113', name: 'Operations Management', units: 3 },
      { code: 'BA114', name: 'Readings in Philippine History', units: 3 },
      { code: 'BA115', name: 'The Contemporary World', units: 3 },
    ],
  },
  BSMT: {
    prefix: 'MT',
    room: 'LAB-MT',
    sem1: [
      { code: 'MT101', name: 'Medical Technology Orientation', units: 3 },
      { code: 'MT102', name: 'Human Anatomy and Physiology', units: 3 },
      { code: 'MT103', name: 'General Chemistry', units: 3 },
      { code: 'MT104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'MT105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'MT111', name: 'Clinical Chemistry 1', units: 3, prerequisite_code: 'MT103' },
      { code: 'MT112', name: 'Medical Laboratory Laws', units: 3, prerequisite_code: 'MT101' },
      { code: 'MT113', name: 'Biostatistics', units: 3, prerequisite_code: 'MT104' },
      { code: 'MT114', name: 'Understanding the Self', units: 3 },
      { code: 'MT115', name: 'Science, Technology and Society', units: 3 },
    ],
  },
  BSME: {
    prefix: 'ME',
    room: 'LAB-ME',
    sem1: [
      { code: 'ME101', name: 'Engineering Drawing', units: 3 },
      { code: 'ME102', name: 'College Algebra', units: 3 },
      { code: 'ME103', name: 'General Physics', units: 3 },
      { code: 'ME104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'ME105', name: 'Communication Skills 1', units: 3 },
    ],
    sem2: [
      { code: 'ME111', name: 'Engineering Mechanics', units: 3, prerequisite_code: 'ME103' },
      { code: 'ME112', name: 'Computer-Aided Drafting', units: 3, prerequisite_code: 'ME101' },
      { code: 'ME113', name: 'Trigonometry for Engineers', units: 3, prerequisite_code: 'ME102' },
      { code: 'ME114', name: 'Readings in Philippine History', units: 3 },
      { code: 'ME115', name: 'The Contemporary World', units: 3 },
    ],
  },
  BSCE: {
    prefix: 'CE',
    room: 'LAB-CE',
    sem1: [
      { code: 'CE101', name: 'Engineering Drawing and Plans', units: 3 },
      { code: 'CE102', name: 'College Algebra', units: 3 },
      { code: 'CE103', name: 'Physics for Engineers', units: 3 },
      { code: 'CE104', name: 'Mathematics in the Modern World', units: 3 },
      { code: 'CE105', name: 'Purposive Communication', units: 3 },
    ],
    sem2: [
      { code: 'CE111', name: 'Surveying Fundamentals', units: 3, prerequisite_code: 'CE101' },
      { code: 'CE112', name: 'Engineering Mechanics', units: 3, prerequisite_code: 'CE103' },
      { code: 'CE113', name: 'Plane and Spherical Trigonometry', units: 3, prerequisite_code: 'CE102' },
      { code: 'CE114', name: 'Understanding the Self', units: 3 },
      { code: 'CE115', name: 'Science, Technology and Society', units: 3 },
    ],
  },
};

const scheduleTemplate = {
  sem1: [
    { days: 'Mon/Wed', start: '07:30:00', end: '09:00:00' },
    { days: 'Mon/Wed', start: '09:00:00', end: '10:30:00' },
    { days: 'Tue/Thu', start: '07:30:00', end: '09:00:00' },
    { days: 'Tue/Thu', start: '09:00:00', end: '10:30:00' },
    { days: 'Fri', start: '08:00:00', end: '11:00:00' },
  ],
  sem2: [
    { days: 'Mon/Wed', start: '10:30:00', end: '12:00:00' },
    { days: 'Mon/Wed', start: '13:00:00', end: '14:30:00' },
    { days: 'Tue/Thu', start: '10:30:00', end: '12:00:00' },
    { days: 'Tue/Thu', start: '13:00:00', end: '14:30:00' },
    { days: 'Fri', start: '13:00:00', end: '16:00:00' },
  ],
};

async function upsertSubject(course, semester, index, subject) {
  const prerequisiteId = subject.prerequisite_code
    ? (await query('SELECT id FROM subjects WHERE code = ?', [subject.prerequisite_code])).rows[0]?.id || null
    : null;

  const existing = await query('SELECT id FROM subjects WHERE code = ?', [subject.code]);
  const id = existing.rows[0]?.id || newId();
  const slot = semester === '1st' ? scheduleTemplate.sem1[index] : scheduleTemplate.sem2[index];

  if (existing.rows[0]) {
    await query(
      `UPDATE subjects
       SET name = ?, units = ?, description = ?, course = ?, year_level = 1, semester = ?, prerequisite_subject_id = ?,
           section_name = ?, schedule_days = ?, start_time = ?, end_time = ?, room = ?, is_open = 1, is_active = 1
       WHERE id = ?`,
      [
        subject.name,
        subject.units,
        `${course} first year ${semester} semester offering`,
        course,
        semester,
        prerequisiteId,
        '1A',
        slot.days,
        slot.start,
        slot.end,
        courseCatalog[course].room,
        id,
      ]
    );
    return id;
  }

  await query(
    `INSERT INTO subjects
     (id, code, name, description, units, course, year_level, semester, prerequisite_subject_id,
      section_name, schedule_days, start_time, end_time, room, is_open)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      id,
      subject.code,
      subject.name,
      `${course} first year ${semester} semester offering`,
      subject.units,
      course,
      semester,
      prerequisiteId,
      '1A',
      slot.days,
      slot.start,
      slot.end,
      courseCatalog[course].room,
    ]
  );
  return id;
}

async function assignTeachers() {
  const { rows: teachers } = await query(
    'SELECT id, assigned_course, specialization FROM teachers WHERE is_active = 1'
  );

  for (const teacher of teachers) {
    let course = teacher.assigned_course;
    if (!course && teacher.specialization) {
      const match = Object.keys(courseCatalog).find((key) =>
        teacher.specialization.toLowerCase().includes(key.replace('BS', '').toLowerCase())
      );
      course = match || null;
    }
    if (!course) continue;

    const { rows: subjects } = await query(
      `SELECT id
       FROM subjects
       WHERE course = ? AND teacher_id IS NULL AND is_active = 1
       ORDER BY semester, code
       LIMIT 3`,
      [course]
    );

    for (const subject of subjects) {
      await query('UPDATE subjects SET teacher_id = ? WHERE id = ?', [teacher.id, subject.id]);
    }
  }
}

async function seedCurriculum() {
  for (const [course, catalog] of Object.entries(courseCatalog)) {
    for (const [index, subject] of catalog.sem1.entries()) {
      await upsertSubject(course, '1st', index, subject);
    }
    for (const [index, subject] of catalog.sem2.entries()) {
      await upsertSubject(course, '2nd', index, subject);
    }
  }

  await assignTeachers();
  console.log('Curriculum seed complete');
}

seedCurriculum()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error('Curriculum seed failed:', err.message);
    await pool.end();
    process.exit(1);
  });
