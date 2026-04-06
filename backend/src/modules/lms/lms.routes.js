const router = require('express').Router();
const controller = require('./lms.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/courses', controller.listCourses);
router.post('/courses', requireRole('admin', 'teacher'), controller.createCourse);
router.post('/courses/:courseId/enroll', controller.enrollStudent);

// Subject-based LMS (v2)
router.get('/subjects/my', controller.listMySubjects);
router.get('/subjects/:subjectId/lessons', controller.listSubjectLessons);
router.post('/subjects/:subjectId/lessons', requireRole('admin', 'teacher'), controller.createSubjectLesson);

router.get('/subjects/:subjectId/assignments', controller.listSubjectAssignments);
router.post('/subjects/:subjectId/assignments', requireRole('admin', 'teacher'), controller.createSubjectAssignment);
router.post('/subject-assignments/:assignmentId/submit', requireRole('student'), controller.submitSubjectAssignment);

router.get('/subjects/:subjectId/quizzes', controller.listSubjectQuizzes);
router.post('/subjects/:subjectId/quizzes', requireRole('admin', 'teacher'), controller.createSubjectQuiz);
router.get('/subject-quizzes/:quizId/questions', controller.getSubjectQuizQuestions);
router.post('/subject-quizzes/:quizId/submit', requireRole('student'), controller.submitSubjectQuiz);

router.get('/subjects/:subjectId/exams', controller.listSubjectExams);
router.post('/subjects/:subjectId/exams', requireRole('admin', 'teacher'), controller.createSubjectExam);
router.get('/subject-exams/:examId/questions', controller.getSubjectExamQuestions);

// Subject-based live exams (v2)
router.post('/subject-exams/:examId/session/open', requireRole('admin', 'teacher'), controller.openSubjectExamSession);
router.post('/subject-exams/:examId/session/start', requireRole('admin', 'teacher'), controller.startSubjectExamSession);
router.post('/subject-exams/:examId/session/pause', requireRole('admin', 'teacher'), controller.pauseSubjectExamSession);
router.post('/subject-exams/:examId/session/resume', requireRole('admin', 'teacher'), controller.resumeSubjectExamSession);
router.post('/subject-exams/:examId/session/stop', requireRole('admin', 'teacher'), controller.stopSubjectExamSession);
router.get('/subject-exams/:examId/session/live', controller.getLiveSubjectExamSession);
router.post('/subject-exams/:examId/session/join', requireRole('student'), controller.joinSubjectExam);
router.post('/subject-exams/:examId/session/heartbeat', requireRole('student'), controller.heartbeatSubjectExam);
router.post('/subject-exams/:examId/submit', requireRole('student'), controller.submitSubjectExam);
router.post('/subject-exams/:examId/force-submit', requireRole('admin', 'teacher'), controller.forceSubmitAllSubjectExam);

router.get('/courses/:courseId/lessons', controller.listLessons);
router.post('/courses/:courseId/lessons', requireRole('admin', 'teacher'), controller.createLesson);

router.get('/courses/:courseId/assignments', controller.listAssignments);
router.post('/courses/:courseId/assignments', requireRole('admin', 'teacher'), controller.createAssignment);
router.post('/assignments/:assignmentId/submit', requireRole('student'), controller.submitAssignment);

router.get('/courses/:courseId/quizzes', controller.listQuizzes);
router.post('/courses/:courseId/quizzes', requireRole('admin', 'teacher'), controller.createQuiz);
router.post('/quizzes/:quizId/submit', requireRole('student'), controller.submitQuiz);

router.get('/courses/:courseId/exams', controller.listExams);
router.post('/courses/:courseId/exams', requireRole('admin', 'teacher'), controller.createExam);
router.post('/exams/:examId/session/start', requireRole('admin', 'teacher'), controller.startExamSession);
router.post('/exams/:examId/session/stop', requireRole('admin', 'teacher'), controller.stopExamSession);
router.get('/exams/:examId/session/live', controller.getLiveExamSession);
router.post('/exams/:examId/session/join', requireRole('student'), controller.joinLiveExam);
router.post('/exams/:examId/session/heartbeat', requireRole('student'), controller.heartbeatExam);
router.post('/exams/:examId/submit', requireRole('student'), controller.submitLiveExam);
router.post('/exams/:examId/force-submit', requireRole('admin', 'teacher'), controller.forceSubmitAll);

module.exports = router;
