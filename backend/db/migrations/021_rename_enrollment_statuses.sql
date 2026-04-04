-- Rename enrollment workflow statuses to match new process:
-- pending > for_subject_enrollment > for_assessment > for_payment > enrolled

-- Migrate existing data first
UPDATE enrollment_batches SET status = 'for_subject_enrollment' WHERE status = 'for_evaluation';
UPDATE enrollment_batches SET status = 'for_assessment' WHERE status = 'evaluated';
UPDATE enrollment_batches SET status = 'for_payment' WHERE status = 'approved';

UPDATE enrollments SET status = 'for_subject_enrollment' WHERE status = 'for_evaluation';
UPDATE enrollments SET status = 'for_assessment' WHERE status = 'evaluated';
UPDATE enrollments SET status = 'for_payment' WHERE status = 'approved';

-- Update CHECK constraints on enrollment_batches
ALTER TABLE enrollment_batches DROP CONSTRAINT chk_batch_status;
ALTER TABLE enrollment_batches
ADD CONSTRAINT chk_batch_status
CHECK (status IN ('pending', 'for_subject_enrollment', 'for_assessment', 'for_payment', 'enrolled', 'dropped'));

-- Update CHECK constraints on enrollments
ALTER TABLE enrollments DROP CONSTRAINT chk_enrollments_status;
ALTER TABLE enrollments
ADD CONSTRAINT chk_enrollments_status
CHECK (status IN ('pending', 'for_subject_enrollment', 'for_assessment', 'for_payment', 'enrolled', 'dropped', 'completed'));
