CREATE TABLE IF NOT EXISTS password_resets (
    id         CHAR(36) NOT NULL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    otp        CHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    used       TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_password_resets_email (email)
);
