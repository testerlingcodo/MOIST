const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'sis_portal',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,
  timezone: '+00:00',
  dateStrings: ['DATE'],
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err.message);
});

async function query(sql, params = []) {
  const start = Date.now();
  const [result] = await pool.query(sql, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('query', { sql: sql.slice(0, 80), duration });
  }
  // SELECT returns array of rows; INSERT/UPDATE/DELETE returns OkPacket
  if (Array.isArray(result)) {
    return { rows: result };
  }
  return { rows: [], rowCount: result.affectedRows };
}

module.exports = { pool, query, newId: uuidv4 };
