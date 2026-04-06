CREATE TABLE IF NOT EXISTS lms_courses (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  code                VARCHAR(30),
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  instructor_user_id  CHAR(36) NOT NULL,
  is_published        TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (instructor_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_course_enrollments (
  id          CHAR(36) NOT NULL PRIMARY KEY,
  course_id   CHAR(36) NOT NULL,
  student_id  CHAR(36) NOT NULL,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_lms_course_student (course_id, student_id),
  FOREIGN KEY (course_id) REFERENCES lms_courses(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_lessons (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  course_id     CHAR(36) NOT NULL,
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
  FOREIGN KEY (course_id) REFERENCES lms_courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_assignments (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  course_id     CHAR(36) NOT NULL,
  title         VARCHAR(200) NOT NULL,
  instructions  TEXT,
  due_at        DATETIME,
  max_score     DECIMAL(6,2) NOT NULL DEFAULT 100.00,
  is_published  TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES lms_courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_assignment_submissions (
  id             CHAR(36) NOT NULL PRIMARY KEY,
  assignment_id  CHAR(36) NOT NULL,
  student_id     CHAR(36) NOT NULL,
  content_text   TEXT,
  content_url    TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'submitted',
  score          DECIMAL(6,2),
  feedback       TEXT,
  submitted_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  graded_at      DATETIME,
  UNIQUE KEY uq_lms_assignment_student (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES lms_assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_quizzes (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  course_id           CHAR(36) NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  time_limit_minutes  INT,
  passing_score       DECIMAL(6,2) NOT NULL DEFAULT 60.00,
  attempts_allowed    INT NOT NULL DEFAULT 1,
  shuffle_questions   TINYINT(1) NOT NULL DEFAULT 0,
  shuffle_choices     TINYINT(1) NOT NULL DEFAULT 0,
  is_published        TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES lms_courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_quiz_questions (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  quiz_id         CHAR(36) NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   VARCHAR(20) NOT NULL DEFAULT 'multiple_choice',
  choices_json    JSON,
  correct_answer  TEXT,
  points          DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  position        INT NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES lms_quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_quiz_attempts (
  id            CHAR(36) NOT NULL PRIMARY KEY,
  quiz_id       CHAR(36) NOT NULL,
  student_id    CHAR(36) NOT NULL,
  attempt_no    INT NOT NULL DEFAULT 1,
  status        VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  score         DECIMAL(6,2),
  max_score     DECIMAL(6,2),
  answers_json  JSON,
  started_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at  DATETIME,
  UNIQUE KEY uq_lms_quiz_attempt (quiz_id, student_id, attempt_no),
  FOREIGN KEY (quiz_id) REFERENCES lms_quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_exams (
  id                  CHAR(36) NOT NULL PRIMARY KEY,
  course_id           CHAR(36) NOT NULL,
  title               VARCHAR(200) NOT NULL,
  description         TEXT,
  start_at            DATETIME,
  end_at              DATETIME,
  duration_minutes    INT,
  timer_enabled       TINYINT(1) NOT NULL DEFAULT 1,
  attempts_allowed    INT NOT NULL DEFAULT 1,
  passing_score       DECIMAL(6,2) NOT NULL DEFAULT 60.00,
  shuffle_questions   TINYINT(1) NOT NULL DEFAULT 0,
  shuffle_choices     TINYINT(1) NOT NULL DEFAULT 0,
  allow_late_join     TINYINT(1) NOT NULL DEFAULT 1,
  is_published        TINYINT(1) NOT NULL DEFAULT 0,
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES lms_courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_exam_questions (
  id              CHAR(36) NOT NULL PRIMARY KEY,
  exam_id         CHAR(36) NOT NULL,
  question_text   TEXT NOT NULL,
  question_type   VARCHAR(20) NOT NULL DEFAULT 'multiple_choice',
  choices_json    JSON,
  correct_answer  TEXT,
  points          DECIMAL(6,2) NOT NULL DEFAULT 1.00,
  position        INT NOT NULL DEFAULT 1,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (exam_id) REFERENCES lms_exams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_exam_sessions (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  exam_id            CHAR(36) NOT NULL,
  host_user_id       CHAR(36) NOT NULL,
  status             VARCHAR(20) NOT NULL DEFAULT 'live',
  started_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  ended_at           DATETIME,
  force_submitted_at DATETIME,
  FOREIGN KEY (exam_id) REFERENCES lms_exams(id) ON DELETE CASCADE,
  FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lms_exam_participants (
  id                 CHAR(36) NOT NULL PRIMARY KEY,
  session_id         CHAR(36) NOT NULL,
  student_id         CHAR(36) NOT NULL,
  joined_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_seen_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  is_online          TINYINT(1) NOT NULL DEFAULT 1,
  status             VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  started_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  submitted_at       DATETIME,
  auto_score         DECIMAL(6,2),
  manual_score       DECIMAL(6,2),
  answers_json       JSON,
  UNIQUE KEY uq_lms_exam_session_student (session_id, student_id),
  FOREIGN KEY (session_id) REFERENCES lms_exam_sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE INDEX idx_lms_lessons_course ON lms_lessons(course_id);
CREATE INDEX idx_lms_assignments_course ON lms_assignments(course_id);
CREATE INDEX idx_lms_quizzes_course ON lms_quizzes(course_id);
CREATE INDEX idx_lms_exams_course ON lms_exams(course_id);
CREATE INDEX idx_lms_exam_sessions_exam_status ON lms_exam_sessions(exam_id, status);
