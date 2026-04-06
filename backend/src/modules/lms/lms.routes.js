const router = require('express').Router();
const controller = require('./lms.controller');
const { authenticate } = require('../../middleware/auth');
const { requireRole } = require('../../middleware/role');

router.use(authenticate);

router.get('/courses', controller.listCourses);
router.post('/courses', requireRole('admin', 'teacher'), controller.createCourse);
router.post('/courses/:courseId/enroll', controller.enrollStudent);

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
