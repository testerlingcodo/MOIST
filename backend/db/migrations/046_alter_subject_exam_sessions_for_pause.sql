ALTER TABLE lms_subject_exam_sessions
  ADD COLUMN paused_at DATETIME NULL AFTER started_at,
  ADD COLUMN total_paused_seconds INT NOT NULL DEFAULT 0 AFTER paused_at;

