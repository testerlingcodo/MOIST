-- Add payment_period to track installment payments (Prelim, Midterm, Semi-Finals, Finals)
ALTER TABLE payments
  ADD COLUMN payment_period VARCHAR(20) DEFAULT NULL
  AFTER notes;
