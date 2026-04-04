-- Default admin user
-- Password: Admin@123 (bcrypt hash)
-- CHANGE THIS IN PRODUCTION!
INSERT IGNORE INTO users (id, email, password, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'admin@sis.edu.ph',
  '$2a$10$Te6cslLq/YI.7hQr5GnHtuQkfX9Q7jZr6PdYnWw4fV9Ab8W5jv63y',
  'admin'
);
