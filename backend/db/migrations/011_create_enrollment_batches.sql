CREATE TABLE IF NOT EXISTS enrollment_batches (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    student_id      CHAR(36) NOT NULL,
    school_year     VARCHAR(20) NOT NULL,
    semester        VARCHAR(10) NOT NULL,
    status          VARCHAR(30) DEFAULT 'for_evaluation',
    dean_id         CHAR(36),
    dean_notes      TEXT,
    evaluated_at    DATETIME,
    approved_by     CHAR(36),
    approved_at     DATETIME,
    registered_by   CHAR(36),
    registered_at   DATETIME,
    created_by      CHAR(36),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (dean_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (registered_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY uq_batch (student_id, school_year, semester),
    CONSTRAINT chk_batch_semester CHECK (semester IN ('1st', '2nd', 'summer')),
    CONSTRAINT chk_batch_status CHECK (status IN ('for_evaluation','pending_approval','approved','registered','dropped'))
);

ALTER TABLE enrollments ADD COLUMN batch_id CHAR(36) AFTER id;
ALTER TABLE enrollments ADD CONSTRAINT fk_enrollment_batch FOREIGN KEY (batch_id) REFERENCES enrollment_batches(id) ON DELETE SET NULL;
ALTER TABLE enrollments DROP CONSTRAINT chk_enrollments_status;
ALTER TABLE enrollments ADD CONSTRAINT chk_enrollments_status CHECK (status IN ('for_evaluation','enrolled','dropped','completed'));
