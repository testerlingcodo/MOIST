ALTER TABLE subjects
  ADD COLUMN course VARCHAR(100) NULL AFTER description,
  ADD COLUMN year_level TINYINT NULL AFTER course,
  ADD COLUMN semester VARCHAR(20) NULL AFTER year_level,
  ADD COLUMN prerequisite_subject_id CHAR(36) NULL AFTER semester,
  ADD COLUMN section_name VARCHAR(30) NULL AFTER prerequisite_subject_id,
  ADD COLUMN schedule_days VARCHAR(50) NULL AFTER section_name,
  ADD COLUMN start_time TIME NULL AFTER schedule_days,
  ADD COLUMN end_time TIME NULL AFTER start_time,
  ADD COLUMN room VARCHAR(30) NULL AFTER end_time,
  ADD COLUMN teacher_id CHAR(36) NULL AFTER room,
  ADD COLUMN is_open TINYINT(1) NOT NULL DEFAULT 1 AFTER teacher_id;

ALTER TABLE subjects
  ADD CONSTRAINT fk_subjects_prerequisite
  FOREIGN KEY (prerequisite_subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

ALTER TABLE subjects
  ADD CONSTRAINT fk_subjects_teacher
  FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL;

CREATE INDEX idx_subjects_curriculum ON subjects(course, year_level, semester);
CREATE INDEX idx_subjects_teacher ON subjects(teacher_id);
CREATE INDEX idx_subjects_open ON subjects(is_open);

ALTER TABLE teachers
  ADD COLUMN specialization VARCHAR(255) NULL AFTER contact_number;

UPDATE subjects s
JOIN teachers t ON t.assigned_subject_id = s.id
SET s.teacher_id = t.id
WHERE s.teacher_id IS NULL;
