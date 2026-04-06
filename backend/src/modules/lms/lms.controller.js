const service = require('./lms.service');

const listCourses = async (req, res, next) => {
  try { res.json(await service.listCourses(req.user)); } catch (e) { next(e); }
};

const createCourse = async (req, res, next) => {
  try { res.status(201).json(await service.createCourse(req.user, req.body)); } catch (e) { next(e); }
};

const enrollStudent = async (req, res, next) => {
  try { res.json(await service.enrollStudent(req.params.courseId, req.user, req.body.student_id)); } catch (e) { next(e); }
};

const listLessons = async (req, res, next) => {
  try { res.json(await service.listLessons(req.params.courseId, req.user)); } catch (e) { next(e); }
};

const createLesson = async (req, res, next) => {
  try { res.status(201).json(await service.createLesson(req.params.courseId, req.user, req.body)); } catch (e) { next(e); }
};

const listAssignments = async (req, res, next) => {
  try { res.json(await service.listAssignments(req.params.courseId, req.user)); } catch (e) { next(e); }
};

const createAssignment = async (req, res, next) => {
  try { res.status(201).json(await service.createAssignment(req.params.courseId, req.user, req.body)); } catch (e) { next(e); }
};

const submitAssignment = async (req, res, next) => {
  try { res.json(await service.submitAssignment(req.params.assignmentId, req.user, req.body)); } catch (e) { next(e); }
};

const listQuizzes = async (req, res, next) => {
  try { res.json(await service.listQuizzes(req.params.courseId, req.user)); } catch (e) { next(e); }
};

const createQuiz = async (req, res, next) => {
  try { res.status(201).json(await service.createQuiz(req.params.courseId, req.user, req.body)); } catch (e) { next(e); }
};

const submitQuiz = async (req, res, next) => {
  try { res.json(await service.submitQuiz(req.params.quizId, req.user, req.body)); } catch (e) { next(e); }
};

const listExams = async (req, res, next) => {
  try { res.json(await service.listExams(req.params.courseId, req.user)); } catch (e) { next(e); }
};

const createExam = async (req, res, next) => {
  try { res.status(201).json(await service.createExam(req.params.courseId, req.user, req.body)); } catch (e) { next(e); }
};

const startExamSession = async (req, res, next) => {
  try { res.json(await service.startExamSession(req.params.examId, req.user)); } catch (e) { next(e); }
};

const stopExamSession = async (req, res, next) => {
  try { res.json(await service.stopExamSession(req.params.examId, req.user)); } catch (e) { next(e); }
};

const getLiveExamSession = async (req, res, next) => {
  try { res.json(await service.getLiveExamSession(req.params.examId, req.user)); } catch (e) { next(e); }
};

const joinLiveExam = async (req, res, next) => {
  try { res.json(await service.joinLiveExam(req.params.examId, req.user)); } catch (e) { next(e); }
};

const heartbeatExam = async (req, res, next) => {
  try { res.json(await service.heartbeatExam(req.params.examId, req.user)); } catch (e) { next(e); }
};

const submitLiveExam = async (req, res, next) => {
  try { res.json(await service.submitLiveExam(req.params.examId, req.user, req.body)); } catch (e) { next(e); }
};

const forceSubmitAll = async (req, res, next) => {
  try { res.json(await service.forceSubmitAll(req.params.examId, req.user)); } catch (e) { next(e); }
};

module.exports = {
  listCourses,
  createCourse,
  enrollStudent,
  listLessons,
  createLesson,
  listAssignments,
  createAssignment,
  submitAssignment,
  listQuizzes,
  createQuiz,
  submitQuiz,
  listExams,
  createExam,
  startExamSession,
  stopExamSession,
  getLiveExamSession,
  joinLiveExam,
  heartbeatExam,
  submitLiveExam,
  forceSubmitAll,
};
