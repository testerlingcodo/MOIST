import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../core/auth/auth_service.dart';
import '../features/login/login_screen.dart';
import '../features/forgot_password/forgot_password_screen.dart';
import '../features/dashboard/dashboard_screen.dart';
import '../features/enrollment/enroll_now_screen.dart';
import '../features/enrollment/my_schedule_screen.dart';
import '../features/grades/grades_screen.dart';
import '../features/inquiries/inquiries_screen.dart';
import '../features/payments/payments_screen.dart';
import '../features/profile/profile_screen.dart';
import '../features/admin/admin_dashboard_screen.dart';
import '../features/admin/admin_students_screen.dart';
import '../features/admin/admin_grades_screen.dart';
import '../features/admin/admin_enrollments_screen.dart';
import '../features/admin/admin_payments_screen.dart';
import '../features/admin/admin_subjects_screen.dart';
import '../features/cashier/cashier_dashboard_screen.dart';
import '../features/teacher/teacher_dashboard_screen.dart';
import '../features/teacher/teacher_grades_screen.dart';
import '../features/dean/dean_dashboard_screen.dart';
import '../features/dean/dean_enrollments_screen.dart';
import '../features/registrar/registrar_dashboard_screen.dart';
import '../features/registrar/registrar_enrollments_screen.dart';
import '../features/registrar/registrar_enrolled_screen.dart';
import '../features/dean/dean_enrolled_screen.dart';
import '../features/dean/dean_grade_review_screen.dart';
import '../features/registrar/registrar_grade_verify_screen.dart';
import '../features/grades/prospectus_screen.dart';
import '../features/dean/dean_student_transcript_screen.dart';
import '../features/notifications/notifications_screen.dart';
import '../features/profile/staff_profile_screen.dart';
import '../features/document_requests/document_requests_screen.dart';
import '../shared/widgets/student_scaffold.dart';
import '../shared/widgets/admin_scaffold.dart';
import '../shared/widgets/teacher_scaffold.dart';
import '../shared/widgets/dean_scaffold.dart';
import '../shared/widgets/registrar_scaffold.dart';
import '../shared/widgets/cashier_scaffold.dart';

class AppRouter {
  final AuthService auth;
  AppRouter(this.auth);

  static final navigatorKey = GlobalKey<NavigatorState>();

  Widget _homeForRole() {
    if (auth.role == 'admin' || auth.role == 'staff') {
      return const AdminDashboardScreen();
    }
    if (auth.role == 'teacher') {
      return const TeacherDashboardScreen();
    }
    if (auth.role == 'dean') {
      return const DeanDashboardScreen();
    }
    if (auth.role == 'registrar') {
      return const RegistrarDashboardScreen();
    }
    if (auth.role == 'cashier') {
      return const CashierDashboardScreen();
    }
    return const DashboardScreen();
  }

  Widget _guardRole(List<String> roles, Widget child) {
    return roles.contains(auth.role) ? child : _homeForRole();
  }

  late final router = GoRouter(
    navigatorKey: AppRouter.navigatorKey,
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isLoggedIn;
      final onLogin = state.matchedLocation == '/login';
      final onForgot = state.matchedLocation == '/forgot-password';
      if (!loggedIn && !onLogin && !onForgot) return '/login';
      if (loggedIn && onLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/forgot-password', builder: (_, __) => const ForgotPasswordScreen()),
      ShellRoute(
        builder: (context, state, child) {
          if (auth.role == 'admin' || auth.role == 'staff') {
            return AdminScaffold(child: child);
          }
          if (auth.role == 'teacher') {
            return TeacherScaffold(child: child);
          }
          if (auth.role == 'dean') {
            return DeanScaffold(child: child);
          }
          if (auth.role == 'registrar') {
            return RegistrarScaffold(child: child);
          }
          if (auth.role == 'cashier') {
            return CashierScaffold(child: child);
          }
          return StudentScaffold(child: child);
        },
        routes: [
          GoRoute(path: '/', builder: (context, state) => _homeForRole()),

          // Shared routes – all roles
          GoRoute(path: '/notifications', builder: (_, __) => const NotificationsScreen()),
          GoRoute(path: '/me', builder: (_, __) => const StaffProfileScreen()),

          GoRoute(
            path: '/admin/subjects',
            builder: (_, __) => _guardRole(['admin'], const AdminSubjectsScreen()),
          ),
          GoRoute(
            path: '/admin/students',
            builder: (_, __) => _guardRole(['admin'], const AdminStudentsScreen()),
          ),
          GoRoute(
            path: '/admin/grades',
            builder: (_, __) => _guardRole(['admin'], const AdminGradesScreen()),
          ),
          GoRoute(
            path: '/admin/enrollments',
            builder: (_, __) => _guardRole(['admin', 'staff'], const AdminEnrollmentsScreen()),
          ),
          GoRoute(
            path: '/admin/payments',
            builder: (_, __) => _guardRole(['admin'], const AdminPaymentsScreen()),
          ),

          GoRoute(
            path: '/teacher/students',
            builder: (_, __) => _guardRole(['teacher'], const AdminStudentsScreen()),
          ),
          GoRoute(
            path: '/teacher/grades',
            builder: (_, __) => _guardRole(['teacher'], const TeacherGradesScreen()),
          ),

          GoRoute(
            path: '/dean/subjects',
            builder: (_, __) => _guardRole(['dean'], const AdminSubjectsScreen()),
          ),
          GoRoute(
            path: '/dean/students',
            builder: (_, __) => _guardRole(['dean'], const AdminStudentsScreen()),
          ),
          GoRoute(
            path: '/dean/grades',
            builder: (_, __) => _guardRole(['dean'], const AdminGradesScreen()),
          ),
          GoRoute(
            path: '/dean/enrolled',
            builder: (_, __) => _guardRole(['dean'], const DeanEnrolledScreen()),
          ),
          GoRoute(
            path: '/dean/enrollments',
            builder: (_, __) => _guardRole(['dean'], const DeanEnrollmentsScreen()),
          ),
          GoRoute(
            path: '/dean/grade-review',
            builder: (_, __) => _guardRole(['dean'], const DeanGradeReviewScreen()),
          ),
          GoRoute(
            path: '/dean/transcript/:id',
            builder: (_, state) => _guardRole(
              ['dean'],
              DeanStudentTranscriptScreen(studentId: state.pathParameters['id']!),
            ),
          ),

          GoRoute(
            path: '/registrar/students',
            builder: (_, __) => _guardRole(['registrar'], const AdminStudentsScreen()),
          ),
          GoRoute(
            path: '/registrar/subjects',
            builder: (_, __) => _guardRole(['registrar'], const AdminSubjectsScreen()),
          ),
          GoRoute(
            path: '/registrar/enrolled',
            builder: (_, __) => _guardRole(['registrar'], const RegistrarEnrolledScreen()),
          ),
          GoRoute(
            path: '/registrar/enrollments',
            builder: (_, __) => _guardRole(['registrar'], const RegistrarEnrollmentsScreen()),
          ),
          GoRoute(
            path: '/registrar/grades',
            builder: (_, __) => _guardRole(['registrar'], const AdminGradesScreen()),
          ),
          GoRoute(
            path: '/registrar/grade-verify',
            builder: (_, __) => _guardRole(['registrar'], const RegistrarGradeVerifyScreen()),
          ),

          GoRoute(
            path: '/cashier/payments',
            builder: (_, __) => _guardRole(['cashier'], const AdminPaymentsScreen()),
          ),

          GoRoute(
            path: '/enroll',
            builder: (_, __) => _guardRole(['student'], const EnrollNowScreen()),
          ),
          GoRoute(
            path: '/schedule',
            builder: (_, __) => _guardRole(['student'], const MyScheduleScreen()),
          ),
          GoRoute(
            path: '/grades',
            builder: (_, __) => _guardRole(['student'], const GradesScreen()),
          ),
          GoRoute(
            path: '/prospectus',
            builder: (_, __) => _guardRole(['student'], const ProspectusScreen()),
          ),
          GoRoute(
            path: '/payments',
            builder: (_, __) => _guardRole(['student'], const PaymentsScreen()),
          ),
          GoRoute(
            path: '/inquiries',
            builder: (_, __) => _guardRole(['student'], const InquiriesScreen()),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => _guardRole(['student'], const ProfileScreen()),
          ),
          GoRoute(
            path: '/documents',
            builder: (_, __) =>
                _guardRole(['student'], const DocumentRequestsScreen()),
          ),
        ],
      ),
    ],
  );
}
