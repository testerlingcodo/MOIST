#!/bin/sh
set -e

echo "Waiting for database..."
MAX_TRIES=30
COUNT=0
until node -e "
  const mysql = require('mysql2/promise');
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }).then(c => { c.end(); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_TRIES ]; then
    echo "Database not ready after $MAX_TRIES attempts. Exiting."
    exit 1
  fi
  echo "DB not ready yet ($COUNT/$MAX_TRIES), retrying in 2s..."
  sleep 2
done

echo "Database is ready. Running migrations..."
node db/migrate.js

echo "Starting server..."
exec node server.js
