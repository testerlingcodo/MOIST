import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/auth/auth_service.dart';
import '../features/login/login_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/courses/manage_courses_screen.dart';
import '../features/quizzes/quiz_builder_screen.dart';
import '../features/exams/create_exam_screen.dart';
import '../features/exams/host_exam_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/students/handled_students_screen.dart';
import '../features/lessons/create_lesson_screen.dart';
import '../features/modules/upload_module_screen.dart';

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
      GoRoute(path: '/login',      builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/dashboard',  builder: (_, __) => const DashboardScreen()),
      GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
      GoRoute(path: '/courses/manage', builder: (_, __) => const ManageCoursesScreen()),
      GoRoute(path: '/quizzes/build',  builder: (_, __) => const QuizBuilderScreen()),
      GoRoute(path: '/exams/create',   builder: (_, __) => const CreateExamScreen()),
      GoRoute(path: '/students/handled', builder: (_, __) => const HandledStudentsScreen()),
      GoRoute(path: '/lessons/create', builder: (_, __) => const CreateLessonScreen()),
      GoRoute(path: '/modules/upload', builder: (_, __) => const UploadModuleScreen()),
      GoRoute(
        path: '/exams/:id/host',
        builder: (_, state) => HostExamScreen(
          examId: state.pathParameters['id'] ?? '',
        ),
      ),
    ],
  );
}
