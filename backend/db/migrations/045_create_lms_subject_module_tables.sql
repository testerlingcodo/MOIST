CREATE TABLE IF NOT EXISTS lms_subject_lessons (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  subject_id    CHAR(36) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  content_type  VARCHAR(20) NOT NULL DEFAULT 'video',
  content_url   TEXT,
  module_type   VARCHAR(20),
  module_url    TEXT,
  position      INT NOT NULL DEFAULT 1,
  is_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_lessons_subject ON lms_subject_lessons(subject_id);

CREATE TABLE IF NOT EXISTS lms_subject_assignments (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  subject_id    CHAR(36) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  instructions  TEXT,
  due_at        DATETIME,
  max_score     INT NOT NULL DEFAULT 100,
  is_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_assignments_subject ON lms_subject_assignments(subject_id);

CREATE TABLE IF NOT EXISTS lms_subject_assignment_submissions (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  assignment_id CHAR(36) NOT NULL,
  student_id    CHAR(36) NOT NULL,
  content_text  TEXT,
  content_url   TEXT,
  submitted_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  status        VARCHAR(20) NOT NULL DEFAULT 'submitted',
  score         INT,
  feedback      TEXT,
  UNIQUE KEY uq_lms_subject_assignment_student (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES lms_subject_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_assignment_submissions_assignment ON lms_subject_assignment_submissions(assignment_id);

CREATE TABLE IF NOT EXISTS lms_subject_quizzes (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  subject_id         CHAR(36) NOT NULL,
  title              VARCHAR(200) NOT NULL,
  time_limit_minutes INT,
  attempts_allowed   INT NOT NULL DEFAULT 1,
  passing_score      INT NOT NULL DEFAULT 60,
  is_published       TINYINT(1) NOT NULL DEFAULT 0,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_quizzes_subject ON lms_subject_quizzes(subject_id);

CREATE TABLE IF NOT EXISTS lms_subject_quiz_questions (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  quiz_id         CHAR(36) NOT NULL,
  question_type   VARCHAR(20) NOT NULL,
  question_text   TEXT NOT NULL,
  choices_json    JSON,
  correct_answer  TEXT,
  points          INT NOT NULL DEFAULT 1,
  position        INT NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES lms_subject_quizzes(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_quiz_questions_quiz ON lms_subject_quiz_questions(quiz_id);

CREATE TABLE IF NOT EXISTS lms_subject_quiz_attempts (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  quiz_id       CHAR(36) NOT NULL,
  student_id    CHAR(36) NOT NULL,
  attempt_no    INT NOT NULL DEFAULT 1,
  answers_json  JSON,
  score         INT,
  passed        TINYINT(1) DEFAULT 0,
  started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at  DATETIME,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lms_subject_quiz_attempt (quiz_id, student_id, attempt_no),
  FOREIGN KEY (quiz_id) REFERENCES lms_subject_quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_quiz_attempts_quiz ON lms_subject_quiz_attempts(quiz_id);

CREATE TABLE IF NOT EXISTS lms_subject_exams (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  subject_id         CHAR(36) NOT NULL,
  title              VARCHAR(200) NOT NULL,
  description        TEXT,
  start_at           DATETIME,
  end_at             DATETIME,
  duration_minutes   INT,
  attempts_allowed   INT NOT NULL DEFAULT 1,
  passing_score      INT NOT NULL DEFAULT 60,
  shuffle_questions  TINYINT(1) NOT NULL DEFAULT 1,
  shuffle_choices    TINYINT(1) NOT NULL DEFAULT 1,
  timer_enabled      TINYINT(1) NOT NULL DEFAULT 1,
  allow_late_join    TINYINT(1) NOT NULL DEFAULT 1,
  is_published       TINYINT(1) NOT NULL DEFAULT 0,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_exams_subject ON lms_subject_exams(subject_id);

CREATE TABLE IF NOT EXISTS lms_subject_exam_questions (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  exam_id         CHAR(36) NOT NULL,
  question_type   VARCHAR(20) NOT NULL,
  question_text   TEXT NOT NULL,
  choices_json    JSON,
  correct_answer  TEXT,
  points          INT NOT NULL DEFAULT 1,
  position        INT NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES lms_subject_exams(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_exam_questions_exam ON lms_subject_exam_questions(exam_id);

CREATE TABLE IF NOT EXISTS lms_subject_exam_sessions (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  exam_id            CHAR(36) NOT NULL,
  host_user_id       CHAR(36) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'waiting',
  started_at         DATETIME,
  ended_at           DATETIME,
  force_submitted_at DATETIME,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES lms_subject_exams(id) ON DELETE CASCADE,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_exam_sessions_exam ON lms_subject_exam_sessions(exam_id);
CREATE INDEX idx_lms_subject_exam_sessions_status ON lms_subject_exam_sessions(status);

CREATE TABLE IF NOT EXISTS lms_subject_exam_participants (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  session_id     CHAR(36) NOT NULL,
  student_id     CHAR(36) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'waiting',
  started_at     DATETIME,
  submitted_at   DATETIME,
  answers_json   JSON,
  auto_score     INT,
  manual_score   INT,
  last_seen_at   DATETIME,
  is_online      TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lms_subject_session_student (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES lms_subject_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_subject_exam_participants_session ON lms_subject_exam_participants(session_id);
CREATE INDEX idx_lms_subject_exam_participants_online ON lms_subject_exam_participants(is_online, last_seen_at);

