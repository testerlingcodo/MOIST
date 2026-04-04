-- Add for_registration status between for_payment and enrolled
-- New flow: for_payment → for_registration (payment verified) → enrolled (Registrar officially enrolls)

ALTER TABLE enrollment_batches DROP CONSTRAINT chk_batch_status;
ALTER TABLE enrollment_batches
ADD CONSTRAINT chk_batch_status
CHECK (status IN ('pending', 'for_subject_enrollment', 'for_assessment', 'for_payment', 'for_registration', 'enrolled', 'dropped'));
