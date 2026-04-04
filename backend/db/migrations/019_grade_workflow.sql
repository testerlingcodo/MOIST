-- Extend grade workflow: add review and verify columns
-- Note: The old CHECK constraint on submission_status is dropped first to allow new status values
ALTER TABLE grades DROP CONSTRAINT chk_grades_submission_status;
ALTER TABLE grades ADD COLUMN reviewed_by CHAR(36) NULL AFTER submitted_at;
ALTER TABLE grades ADD COLUMN reviewed_at DATETIME NULL AFTER reviewed_by;
ALTER TABLE grades ADD COLUMN verified_by CHAR(36) NULL AFTER reviewed_at;
ALTER TABLE grades ADD COLUMN verified_at DATETIME NULL AFTER verified_by;
ALTER TABLE grades ADD CONSTRAINT fk_grades_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE grades ADD CONSTRAINT fk_grades_verified_by FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
