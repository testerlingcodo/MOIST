-- Add batch_id to link payments to enrollment batches
ALTER TABLE payments ADD COLUMN batch_id CHAR(36) AFTER id;
ALTER TABLE payments ADD CONSTRAINT fk_payment_batch FOREIGN KEY (batch_id) REFERENCES enrollment_batches(id) ON DELETE SET NULL;

-- Add online payment tracking columns
ALTER TABLE payments ADD COLUMN reference_number VARCHAR(100) AFTER payment_method;
ALTER TABLE payments ADD COLUMN submitted_by VARCHAR(20) NOT NULL DEFAULT 'cashier' AFTER reference_number;
ALTER TABLE payments ADD COLUMN notes TEXT;
ALTER TABLE payments ADD COLUMN verified_by CHAR(36);
ALTER TABLE payments ADD COLUMN verified_at DATETIME;
ALTER TABLE payments ADD CONSTRAINT fk_payment_verifier FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL;

-- Expand status CHECK to include verified/rejected
ALTER TABLE payments DROP CONSTRAINT chk_payments_status;
ALTER TABLE payments ADD CONSTRAINT chk_payments_status
  CHECK (status IN ('pending', 'verified', 'rejected', 'paid', 'failed', 'refunded'));

-- Add assessed_amount to enrollment_batches (locked in when approved)
ALTER TABLE enrollment_batches ADD COLUMN assessed_amount DECIMAL(10,2) AFTER approved_at;
