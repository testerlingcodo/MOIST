CREATE TABLE IF NOT EXISTS tuition (
    id              CHAR(36) NOT NULL PRIMARY KEY,
    school_year     VARCHAR(20) NOT NULL,
    semester        VARCHAR(20) NOT NULL,
    course          VARCHAR(100),
    year_level      TINYINT,
    total_amount    DECIMAL(10,2) NOT NULL,
    per_unit_fee    DECIMAL(10,2),
    misc_fee        DECIMAL(10,2) DEFAULT 0,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tuition (school_year, semester, course, year_level),
    CONSTRAINT chk_tuition_semester CHECK (semester IN ('1st', '2nd', 'summer')),
    CONSTRAINT chk_tuition_year CHECK (year_level BETWEEN 1 AND 6)
);

CREATE INDEX idx_tuition_school_year ON tuition(school_year, semester);
