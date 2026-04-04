ALTER TABLE password_resets
  ADD COLUMN reset_token CHAR(64) NULL AFTER otp,
  ADD COLUMN token_expires_at DATETIME NULL AFTER reset_token;
