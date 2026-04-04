ALTER TABLE grades
  ADD COLUMN is_credited TINYINT(1) NOT NULL DEFAULT 0 AFTER remarks,
  ADD COLUMN source_school VARCHAR(200) AFTER is_credited;
