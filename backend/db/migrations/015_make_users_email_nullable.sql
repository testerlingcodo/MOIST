-- Make email nullable on users table (student login uses student_number instead)
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) UNIQUE NULL;
