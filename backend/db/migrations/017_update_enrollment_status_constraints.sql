ALTER TABLE enrollments DROP CONSTRAINT chk_enrollments_status;

ALTER TABLE enrollments
ADD CONSTRAINT chk_enrollments_status
CHECK (status IN ('pending', 'for_evaluation', 'evaluated', 'approved', 'enrolled', 'dropped', 'completed'));

ALTER TABLE enrollment_batches DROP CONSTRAINT chk_batch_status;

ALTER TABLE enrollment_batches
ADD CONSTRAINT chk_batch_status
CHECK (status IN ('pending', 'for_evaluation', 'evaluated', 'approved', 'enrolled', 'dropped', 'pending_approval', 'registered'));
