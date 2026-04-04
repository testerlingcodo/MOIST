import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminScaffold extends StatelessWidget {
  final Widget child;
  const AdminScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    final isRoot = location == '/';

    const titles = {
      '/': 'Dashboard',
      '/admin/subjects': 'Subjects',
      '/admin/students': 'Students',
      '/admin/grades': 'Grades',
      '/admin/enrollments': 'Enrollment Approval',
      '/admin/payments': 'Payments',
      '/notifications': 'Notifications',
      '/me': 'Profile',
    };

    final navIndex = location == '/notifications'
        ? 1
        : location == '/me'
            ? 2
            : 0;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        leading: isRoot || location == '/notifications' || location == '/me'
            ? null
            : IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.go('/'),
                tooltip: 'Back to home',
              ),
        title: Text(titles[location] ?? 'SIS Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: () => context.read<AuthService>().logout(),
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: navIndex,
        onTap: (i) {
          if (i == 0) context.go('/');
          if (i == 1) context.go('/notifications');
          if (i == 2) context.go('/me');
        },
        selectedItemColor: AppTheme.primary,
        unselectedItemColor: Colors.grey.shade400,
        backgroundColor: AppTheme.paper,
        elevation: 8,
        type: BottomNavigationBarType.fixed,
        selectedLabelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        unselectedLabelStyle: const TextStyle(fontSize: 11),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.notifications_outlined), activeIcon: Icon(Icons.notifications_rounded), label: 'Notifications'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline_rounded), activeIcon: Icon(Icons.person_rounded), label: 'Profile'),
        ],
      ),
    );
  }
}
