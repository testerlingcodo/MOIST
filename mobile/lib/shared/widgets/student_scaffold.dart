import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/app_theme.dart';

class StudentScaffold extends StatelessWidget {
  final Widget child;
  const StudentScaffold({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;

    final navIndex = location.startsWith('/payments')
        ? 1
        : location.startsWith('/grades') || location.startsWith('/prospectus')
            ? 2
            : location.startsWith('/profile')
                ? 3
                : 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.07),
              blurRadius: 24,
              offset: const Offset(0, -4),
            ),
            BoxShadow(
              color: AppTheme.maroon.withValues(alpha: 0.05),
              blurRadius: 8,
              offset: const Offset(0, -1),
            ),
          ],
        ),
        child: NavigationBar(
          selectedIndex: navIndex,
          onDestinationSelected: (i) {
            if (i == 0) context.go('/');
            if (i == 1) context.go('/payments');
            if (i == 2) context.go('/grades');
            if (i == 3) context.go('/profile');
          },
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.receipt_long_outlined),
              selectedIcon: Icon(Icons.receipt_long_rounded),
              label: 'Payments',
            ),
            NavigationDestination(
              icon: Icon(Icons.bar_chart_outlined),
              selectedIcon: Icon(Icons.bar_chart_rounded),
              label: 'Grades',
            ),
            NavigationDestination(
              icon: Icon(Icons.person_outline_rounded),
              selectedIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
