CREATE TABLE IF NOT EXISTS academic_settings (
  id          CHAR(36)    NOT NULL PRIMARY KEY,
  school_year VARCHAR(20) NOT NULL,
  semester    VARCHAR(10) NOT NULL,
  label       VARCHAR(100),
  is_active   TINYINT(1)  NOT NULL DEFAULT 0,
  created_by  CHAR(36),
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_acad_semester CHECK (semester IN ('1st', '2nd', 'summer')),
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
