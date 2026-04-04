-- Add 'pending' and 'rejected' statuses for student registration approval flow
ALTER TABLE students DROP CONSTRAINT chk_students_status;
ALTER TABLE students ADD CONSTRAINT chk_students_status
  CHECK (status IN ('active', 'inactive', 'graduated', 'dropped', 'pending', 'rejected'));
