ALTER TABLE grades
  ADD COLUMN prelim_status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER prelim_grade,
  ADD COLUMN midterm_status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER midterm_grade,
  ADD COLUMN semi_final_status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER semi_final_grade,
  ADD COLUMN final_status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER final_grade;

UPDATE grades
SET
  prelim_status = CASE
    WHEN final_grade IS NOT NULL OR semi_final_grade IS NOT NULL OR midterm_grade IS NOT NULL THEN
      CASE WHEN prelim_grade IS NOT NULL THEN CASE WHEN submission_status = 'official' THEN 'official' ELSE 'under_review' END ELSE 'draft' END
    WHEN prelim_grade IS NOT NULL THEN submission_status
    ELSE 'draft'
  END,
  midterm_status = CASE
    WHEN final_grade IS NOT NULL OR semi_final_grade IS NOT NULL THEN
      CASE WHEN midterm_grade IS NOT NULL THEN CASE WHEN submission_status = 'official' THEN 'official' ELSE 'under_review' END ELSE 'draft' END
    WHEN midterm_grade IS NOT NULL THEN submission_status
    ELSE 'draft'
  END,
  semi_final_status = CASE
    WHEN final_grade IS NOT NULL THEN
      CASE WHEN semi_final_grade IS NOT NULL THEN CASE WHEN submission_status = 'official' THEN 'official' ELSE 'under_review' END ELSE 'draft' END
    WHEN semi_final_grade IS NOT NULL THEN submission_status
    ELSE 'draft'
  END,
  final_status = CASE
    WHEN final_grade IS NOT NULL THEN submission_status
    ELSE 'draft'
  END;

ALTER TABLE grades
  ADD CONSTRAINT chk_grades_prelim_status CHECK (prelim_status IN ('draft', 'submitted', 'under_review', 'official')),
  ADD CONSTRAINT chk_grades_midterm_status CHECK (midterm_status IN ('draft', 'submitted', 'under_review', 'official')),
  ADD CONSTRAINT chk_grades_semi_final_status CHECK (semi_final_status IN ('draft', 'submitted', 'under_review', 'official')),
  ADD CONSTRAINT chk_grades_final_status CHECK (final_status IN ('draft', 'submitted', 'under_review', 'official'));
