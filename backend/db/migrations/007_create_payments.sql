CREATE TABLE IF NOT EXISTS payments (
    id                  CHAR(36) NOT NULL PRIMARY KEY,
    student_id          CHAR(36) NOT NULL,
    tuition_id          CHAR(36),
    school_year         VARCHAR(20) NOT NULL,
    semester            VARCHAR(20) NOT NULL,
    amount              DECIMAL(10,2) NOT NULL,
    payment_type        VARCHAR(30) DEFAULT 'full',
    status              VARCHAR(20) DEFAULT 'pending',
    paymongo_payment_id VARCHAR(255),
    paymongo_link_id    VARCHAR(255),
    payment_method      VARCHAR(50),
    paid_at             DATETIME,
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
    FOREIGN KEY (tuition_id) REFERENCES tuition(id) ON DELETE SET NULL,
    CONSTRAINT chk_payments_semester CHECK (semester IN ('1st', '2nd', 'summer')),
    CONSTRAINT chk_payments_type CHECK (payment_type IN ('full', 'installment', 'misc')),
    CONSTRAINT chk_payments_status CHECK (status IN ('pending', 'paid', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_student_id ON payments(student_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_school_year ON payments(school_year, semester);
