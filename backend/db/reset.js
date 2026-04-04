require('dotenv').config();
const { pool } = require('../src/config/db');
const { execSync } = require('child_process');

async function reset() {
  console.log('Dropping all tables...');

  // Disable FK checks so we can drop in any order
  await pool.query('SET FOREIGN_KEY_CHECKS = 0');

  const [tables] = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = DATABASE()
  `);

  for (const row of tables) {
    const tableName = row.TABLE_NAME || row.table_name;
    await pool.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    console.log(`Dropped table: ${tableName}`);
  }

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  await pool.end();

  console.log('All tables dropped. Running migrations...');
  execSync('node db/migrate.js', { stdio: 'inherit' });
}

reset().catch((err) => {
  console.error('Reset failed:', err.message);
  process.exit(1);
});
