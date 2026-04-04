ALTER TABLE payments
  ADD COLUMN xendit_invoice_id VARCHAR(100) NULL AFTER paymongo_payment_id,
  ADD COLUMN convenience_fee   DECIMAL(10,2) NOT NULL DEFAULT 0 AFTER xendit_invoice_id;
