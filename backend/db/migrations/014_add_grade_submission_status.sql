ALTER TABLE grades
    ADD COLUMN submission_status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER remarks,
    ADD COLUMN submitted_by CHAR(36) NULL AFTER encoded_by,
    ADD COLUMN submitted_at DATETIME NULL AFTER submitted_by;

ALTER TABLE grades
    ADD CONSTRAINT chk_grades_submission_status CHECK (submission_status IN ('draft', 'submitted')),
    ADD CONSTRAINT fk_grades_submitted_by FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_grades_submission_status ON grades(submission_status);
