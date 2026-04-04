CREATE TABLE IF NOT EXISTS document_requests (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  student_id    CHAR(36) NOT NULL,
  document_type VARCHAR(100) NOT NULL,
  purpose       TEXT NULL,
  copies        TINYINT NOT NULL DEFAULT 1,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending',
  remarks       TEXT NULL,
  requested_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_docreq_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT chk_docreq_status CHECK (status IN ('pending','in_process','ready_for_release','completed','rejected'))
);
CREATE INDEX idx_docreq_student ON document_requests(student_id);
CREATE INDEX idx_docreq_status ON document_requests(status);
