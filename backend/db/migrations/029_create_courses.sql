CREATE TABLE IF NOT EXISTS courses (
    id         CHAR(36) NOT NULL PRIMARY KEY,
    code       VARCHAR(20) NOT NULL UNIQUE,
    name       VARCHAR(200),
    is_active  TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO courses (id, code, name) VALUES
  (UUID(), 'BSIT',   'Bachelor of Science in Information Technology'),
  (UUID(), 'BSCS',   'Bachelor of Science in Computer Science'),
  (UUID(), 'BSA',    'Bachelor of Science in Accountancy'),
  (UUID(), 'BSEd',   'Bachelor of Science in Education'),
  (UUID(), 'BSBA',   'Bachelor of Science in Business Administration'),
  (UUID(), 'BSMT',   'Bachelor of Science in Marine Transportation'),
  (UUID(), 'BSME',   'Bachelor of Science in Mechanical Engineering'),
  (UUID(), 'BSCE',   'Bachelor of Science in Civil Engineering'),
  (UUID(), 'BSCRIM', 'Bachelor of Science in Criminology');
