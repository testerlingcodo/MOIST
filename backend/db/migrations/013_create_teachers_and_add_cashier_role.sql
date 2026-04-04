ALTER TABLE users DROP CONSTRAINT chk_users_role;
ALTER TABLE users ADD CONSTRAINT chk_users_role
  CHECK (role IN ('admin', 'staff', 'teacher', 'dean', 'registrar', 'cashier', 'student'));

CREATE TABLE IF NOT EXISTS teachers (
    id                   CHAR(36) NOT NULL PRIMARY KEY,
    user_id              CHAR(36) NOT NULL,
    first_name           VARCHAR(100) NOT NULL,
    last_name            VARCHAR(100) NOT NULL,
    middle_name          VARCHAR(100),
    contact_number       VARCHAR(30),
    assigned_course      VARCHAR(100),
    assigned_year_level  TINYINT,
    assigned_subject_id  CHAR(36),
    is_active            TINYINT(1) DEFAULT 1,
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_teachers_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    CONSTRAINT chk_teachers_year_level CHECK (assigned_year_level BETWEEN 1 AND 6)
);

CREATE INDEX idx_teachers_name ON teachers(last_name, first_name);
CREATE INDEX idx_teachers_subject ON teachers(assigned_subject_id);
