-- Add is_minor flag to subjects
ALTER TABLE subjects
  ADD COLUMN is_minor TINYINT(1) NOT NULL DEFAULT 0 AFTER course;

-- Junction table: which courses a minor subject belongs to
CREATE TABLE IF NOT EXISTS subject_minor_courses (
  subject_id  CHAR(36)     NOT NULL,
  course      VARCHAR(100) NOT NULL,
  PRIMARY KEY (subject_id, course),
  CONSTRAINT fk_smc_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);
