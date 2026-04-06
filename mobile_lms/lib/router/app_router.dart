import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/auth/auth_service.dart';
import '../features/login/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/courses/course_list_screen.dart';
import '../features/courses/course_detail_screen.dart';
import '../features/lessons/video_lesson_screen.dart';
import '../features/lessons/all_subject_lessons_screen.dart';
import '../features/modules/module_viewer_screen.dart';
import '../features/modules/all_subject_modules_screen.dart';
import '../features/assignments/assignment_screen.dart';
import '../features/quizzes/quiz_screen.dart';
import '../features/quizzes/take_quiz_screen.dart';
import '../features/exams/exam_list_screen.dart';
import '../features/exams/take_exam_screen.dart';
import '../features/exams/exam_waiting_room_screen.dart';
import '../features/discussion/discussion_screen.dart';
import '../features/progress/progress_screen.dart';
import '../features/notifications/notifications_screen.dart';

class AppRouter {
  final AuthService auth;
  static final navigatorKey = GlobalKey<NavigatorState>();

  AppRouter(this.auth);

  late final router = GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/login',
    refreshListenable: auth,
    redirect: (context, state) {
      final isLogin = state.matchedLocation == '/login';
      if (!auth.isLoggedIn) return isLogin ? null : '/login';
      if (isLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/dashboard', builder: (_, __) => const DashboardScreen()),
      GoRoute(
        path: '/notifications',
        builder: (_, __) => const NotificationsScreen(),
      ),
      GoRoute(path: '/courses', builder: (_, __) => const CourseListScreen()),
      GoRoute(
        path: '/courses/:id',
        builder: (_, state) =>
            CourseDetailScreen(courseId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/lessons/:courseId',
        builder: (_, state) =>
            VideoLessonScreen(courseId: state.pathParameters['courseId'] ?? ''),
      ),
      GoRoute(
        path: '/lessons/all',
        builder: (_, __) => const AllSubjectLessonsScreen(),
      ),
      GoRoute(
        path: '/modules/:courseId',
        builder: (_, state) => ModuleViewerScreen(
          courseId: state.pathParameters['courseId'] ?? '',
        ),
      ),
      GoRoute(
        path: '/modules/all',
        builder: (_, __) => const AllSubjectModulesScreen(),
      ),
      GoRoute(
        path: '/assignments',
        builder: (_, __) => const AssignmentScreen(),
      ),
      GoRoute(path: '/quizzes', builder: (_, __) => const QuizScreen()),
      GoRoute(
        path: '/quizzes/:id/take',
        builder: (_, state) =>
            TakeQuizScreen(quizId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(path: '/exams', builder: (_, __) => const ExamListScreen()),
      GoRoute(
        path: '/exams/:id/take',
        builder: (_, state) =>
            TakeExamScreen(examId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/exams/:id/wait',
        builder: (_, state) =>
            ExamWaitingRoomScreen(examId: state.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/discussion',
        builder: (_, __) => const DiscussionScreen(),
      ),
      GoRoute(path: '/progress', builder: (_, __) => const ProgressScreen()),
    ],
  );
}
