require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function seed() {
  const seedsDir = path.join(__dirname, 'seeds');
  const files = fs.readdirSync(seedsDir).sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await pool.execute(stmt);
    }
    console.log(`Applied seed: ${file}`);
  }

  console.log('Seeding complete');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});
