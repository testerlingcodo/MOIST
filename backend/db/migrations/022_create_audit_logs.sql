CREATE TABLE IF NOT EXISTS audit_logs (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  actor_id     CHAR(36),
  actor_name   VARCHAR(255),
  actor_role   VARCHAR(50),
  action       VARCHAR(100) NOT NULL,
  entity       VARCHAR(100) NOT NULL,
  entity_id    VARCHAR(100),
  description  TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_entity  (entity, entity_id),
  INDEX idx_audit_actor   (actor_id),
  INDEX idx_audit_created (created_at)
);
