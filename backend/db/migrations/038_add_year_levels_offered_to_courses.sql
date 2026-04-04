-- Add year_levels_offered to courses.
-- Comma-separated list of year levels accepting students, e.g. "1,2,3,4"
-- Default is all four year levels.
ALTER TABLE courses
  ADD COLUMN year_levels_offered VARCHAR(20) NOT NULL DEFAULT '1,2,3,4' AFTER name;
