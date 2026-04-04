ALTER TABLE grades
  ADD COLUMN prelim_grade DECIMAL(5,2) NULL AFTER enrollment_id,
  ADD COLUMN semi_final_grade DECIMAL(5,2) NULL AFTER midterm_grade;

ALTER TABLE grades
  ADD CONSTRAINT chk_grades_prelim CHECK (prelim_grade BETWEEN 1.0 AND 5.0),
  ADD CONSTRAINT chk_grades_semi_final CHECK (semi_final_grade BETWEEN 1.0 AND 5.0);
