ALTER TABLE payments
  ADD COLUMN xendit_invoice_url VARCHAR(500) NULL AFTER xendit_invoice_id,
  ADD COLUMN xendit_expires_at DATETIME NULL AFTER xendit_invoice_url;

ALTER TABLE audit_logs
  ADD COLUMN details_json LONGTEXT NULL AFTER description;
