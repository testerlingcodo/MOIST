CREATE TABLE IF NOT EXISTS students (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    user_id         CHAR(36) UNIQUE,
    student_number  VARCHAR(20) UNIQUE NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    middle_name     VARCHAR(100),
    birthdate       DATE,
    gender          VARCHAR(10),
    address         TEXT,
    contact_number  VARCHAR(20),
    email           VARCHAR(255),
    year_level      TINYINT,
    course          VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'active',
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_students_gender CHECK (gender IN ('male', 'female', 'other')),
    CONSTRAINT chk_students_status CHECK (status IN ('active', 'inactive', 'graduated', 'dropped')),
    CONSTRAINT chk_students_year CHECK (year_level BETWEEN 1 AND 6)
);

CREATE INDEX idx_students_student_number ON students(student_number);
CREATE INDEX idx_students_status ON students(status);
CREATE INDEX idx_students_course ON students(course);
