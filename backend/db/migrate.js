require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function migrate() {
  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).sort();

  // Create migrations tracking table
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      filename    VARCHAR(255) UNIQUE NOT NULL,
      applied_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  for (const file of files) {
    const [rows] = await pool.execute(
      'SELECT id FROM _migrations WHERE filename = ?',
      [file]
    );
    if (rows.length > 0) {
      console.log(`Skipping ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

    // Split on semicolons to run multiple statements
    // Use pool.query (text protocol) instead of pool.execute (prepared statements)
    // because DDL statements like ALTER TABLE are not supported in prepared statement protocol
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);
    for (const stmt of statements) {
      await pool.query(stmt);
    }

    await pool.execute('INSERT INTO _migrations (filename) VALUES (?)', [file]);
    console.log(`Applied ${file}`);
  }

  console.log('Migrations complete');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
