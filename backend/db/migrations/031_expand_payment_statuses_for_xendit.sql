ALTER TABLE payments DROP CONSTRAINT chk_payments_status;

ALTER TABLE payments ADD CONSTRAINT chk_payments_status
  CHECK (status IN (
    'pending',
    'verified',
    'rejected',
    'paid',
    'failed',
    'refunded',
    'awaiting_payment',
    'cancelled'
  ));
