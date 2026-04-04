require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('../src/config/db');

const teachers = [
  { first: 'Maria', last: 'Santos',     mid: 'Cruz',      course: 'BSIT',   yr: 1, spec: 'Web Development, Programming' },
  { first: 'Jose',  last: 'Reyes',      mid: 'Garcia',    course: 'BSIT',   yr: 2, spec: 'Database Systems, Software Engineering' },
  { first: 'Ana',   last: 'Bautista',   mid: 'Lopez',     course: 'BSIT',   yr: 3, spec: 'Networks, Information Security' },
  { first: 'Carlo', last: 'Dela Cruz',  mid: 'Mendoza',   course: 'BSIT',   yr: 4, spec: 'Mobile Development, Capstone' },
  { first: 'Rosa',  last: 'Villanueva', mid: 'Aquino',    course: 'BSCS',   yr: 1, spec: 'Discrete Mathematics, Programming Fundamentals' },
  { first: 'Mark',  last: 'Fernandez',  mid: 'Torres',    course: 'BSCS',   yr: 2, spec: 'Data Structures, Algorithms' },
  { first: 'Liza',  last: 'Gonzales',   mid: 'Ramos',     course: 'BSCS',   yr: 3, spec: 'Artificial Intelligence, Machine Learning' },
  { first: 'Ramon', last: 'Castillo',   mid: 'Navarro',   course: 'BSCS',   yr: 4, spec: 'Computer Architecture, Research Methods' },
  { first: 'Elena', last: 'Morales',    mid: 'Estrada',   course: 'BSA',    yr: 1, spec: 'Fundamentals of Accounting, Business Math' },
  { first: 'Pedro', last: 'Magtibay',   mid: 'Serrano',   course: 'BSA',    yr: 2, spec: 'Financial Accounting, Cost Accounting' },
  { first: 'Grace', last: 'Abad',       mid: 'Flores',    course: 'BSA',    yr: 3, spec: 'Auditing, Taxation' },
  { first: 'Ryan',  last: 'Pascual',    mid: 'Villarin',  course: 'BSA',    yr: 4, spec: 'CPA Review, Government Accounting' },
  { first: 'Diana', last: 'Ocampo',     mid: 'Padilla',   course: 'BSEd',   yr: 1, spec: 'Child Development, Teaching Profession' },
  { first: 'Felix', last: 'Tolentino',  mid: 'Quirino',   course: 'BSEd',   yr: 2, spec: 'Curriculum Development, Technology in Education' },
  { first: 'Nora',  last: 'Macapagal',  mid: 'Salazar',   course: 'BSEd',   yr: 3, spec: 'Principles of Teaching, Assessment' },
  { first: 'Joel',  last: 'Mercado',    mid: 'Umali',     course: 'BSBA',   yr: 1, spec: 'Principles of Management, Business Communication' },
  { first: 'Tess',  last: 'Pineda',     mid: 'Valdez',    course: 'BSBA',   yr: 2, spec: 'Marketing, Human Resource Management' },
  { first: 'Leo',   last: 'Aguilar',    mid: 'Wenceslao', course: 'BSBA',   yr: 3, spec: 'Strategic Management, Entrepreneurship' },
  { first: 'Mila',  last: 'Buenaventura', mid: 'Xavier',  course: 'BSMT',   yr: 1, spec: 'Marine Science, Navigation' },
  { first: 'Dante', last: 'Cabuhat',    mid: 'Ylanan',    course: 'BSMT',   yr: 2, spec: 'Ship Stability, Meteorology' },
  { first: 'Alma',  last: 'Dizon',      mid: 'Zamora',    course: 'BSME',   yr: 1, spec: 'Engineering Drawing, Thermodynamics' },
  { first: 'Victor', last: 'Enriquez',  mid: 'Abaya',     course: 'BSME',   yr: 2, spec: 'Machine Design, Fluid Mechanics' },
  { first: 'Cathy', last: 'Fajardo',    mid: 'Balagtas',  course: 'BSCE',   yr: 1, spec: 'Engineering Mechanics, Surveying' },
  { first: 'Rico',  last: 'Guzman',     mid: 'Capulong',  course: 'BSCE',   yr: 2, spec: 'Structural Theory, Hydraulics' },
  { first: 'Ines',  last: 'Herrera',    mid: 'Dayao',     course: 'BSCRIM', yr: 1, spec: 'Introduction to Criminology, Criminal Law' },
  { first: 'Alex',  last: 'Ibañez',     mid: 'Evangelio', course: 'BSCRIM', yr: 2, spec: 'Forensic Science, Criminal Investigation' },
];

async function seedTeachers() {
  const passwordHash = await bcrypt.hash('Teacher@123', 10);

  for (const t of teachers) {
    const userId = uuidv4();
    const teacherId = uuidv4();
    const email = `${t.first.toLowerCase()}.${t.last.toLowerCase().replace(/\s/g, '').replace(/[^a-z]/g, '')}@faculty.edu.ph`;

    try {
      await pool.execute(
        'INSERT IGNORE INTO users (id, email, password, role) VALUES (?, ?, ?, ?)',
        [userId, email, passwordHash, 'teacher']
      );

      // Get the actual user id (in case email already exists)
      const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      const actualUserId = rows[0].id;

      await pool.execute(
        `INSERT IGNORE INTO teachers
          (id, user_id, first_name, last_name, middle_name, specialization, assigned_course, assigned_year_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [teacherId, actualUserId, t.first, t.last, t.mid, t.spec, t.course, t.yr]
      );

      console.log(`Created teacher: ${t.first} ${t.last} (${email})`);
    } catch (err) {
      console.error(`Failed for ${t.first} ${t.last}: ${err.message}`);
    }
  }

  console.log('\nDone! All teachers use password: Teacher@123');
  await pool.end();
}

seedTeachers().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
