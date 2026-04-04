require('dotenv').config();
const app = require('./src/app');
const { pool } = require('./src/config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
}

start();
