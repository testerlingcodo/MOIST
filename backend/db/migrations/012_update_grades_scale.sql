ALTER TABLE grades DROP CONSTRAINT chk_grades_midterm;
ALTER TABLE grades DROP CONSTRAINT chk_grades_final;
ALTER TABLE grades DROP CONSTRAINT chk_grades_remarks;
ALTER TABLE grades ADD CONSTRAINT chk_grades_midterm CHECK (midterm_grade BETWEEN 1.0 AND 5.0);
ALTER TABLE grades ADD CONSTRAINT chk_grades_final CHECK (final_grade BETWEEN 1.0 AND 5.0);
ALTER TABLE grades ADD CONSTRAINT chk_grades_remarks CHECK (remarks IN ('passed','failed','incomplete','dropped'));
