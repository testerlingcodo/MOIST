CREATE TABLE IF NOT EXISTS enrollments (
    id          CHAR(36) NOT NULL PRIMARY KEY,
    student_id  CHAR(36) NOT NULL,
    subject_id  CHAR(36) NOT NULL,
    school_year VARCHAR(20) NOT NULL,
    semester    VARCHAR(20) NOT NULL,
    status      VARCHAR(20) DEFAULT 'enrolled',
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE RESTRICT,
    UNIQUE KEY uq_enrollment (student_id, subject_id, school_year, semester),
    CONSTRAINT chk_enrollments_semester CHECK (semester IN ('1st', '2nd', 'summer')),
    CONSTRAINT chk_enrollments_status CHECK (status IN ('enrolled', 'dropped', 'completed'))
);

CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_subject_id ON enrollments(subject_id);
CREATE INDEX idx_enrollments_school_year ON enrollments(school_year, semester);
