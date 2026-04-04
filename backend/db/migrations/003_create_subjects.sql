CREATE TABLE IF NOT EXISTS subjects (
    id          CHAR(36) NOT NULL PRIMARY KEY,
    code        VARCHAR(20) UNIQUE NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description TEXT,
    units       TINYINT NOT NULL DEFAULT 3,
    is_active   TINYINT(1) DEFAULT 1,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_subjects_code ON subjects(code);
