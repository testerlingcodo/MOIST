CREATE TABLE IF NOT EXISTS grades (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    enrollment_id   CHAR(36) NOT NULL UNIQUE,
    midterm_grade   DECIMAL(5,2),
    final_grade     DECIMAL(5,2),
    remarks         VARCHAR(20),
    encoded_by      CHAR(36),
    encoded_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
    FOREIGN KEY (encoded_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_grades_midterm CHECK (midterm_grade BETWEEN 0 AND 100),
    CONSTRAINT chk_grades_final CHECK (final_grade BETWEEN 0 AND 100),
    CONSTRAINT chk_grades_remarks CHECK (remarks IN ('passed', 'failed', 'incomplete', 'dropped'))
);

CREATE INDEX idx_grades_enrollment_id ON grades(enrollment_id);
