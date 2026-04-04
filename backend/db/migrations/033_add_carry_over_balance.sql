-- Add carry_over_balance to enrollment_batches
-- This stores the sum of unpaid balances from all previous terms
-- which gets added to the current term's assessed_amount at approval time

ALTER TABLE enrollment_batches
  ADD COLUMN carry_over_balance DECIMAL(10,2) NOT NULL DEFAULT 0
  AFTER assessed_amount;
