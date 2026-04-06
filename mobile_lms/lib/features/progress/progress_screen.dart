import 'package:flutter/material.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class ProgressScreen extends StatelessWidget {
  const ProgressScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Progress & Grades', showBack: true),
      body: ListView(
        children: const [
          LMSEmptyState(
            icon: Icons.insights_outlined,
            title: 'No progress data yet',
            subtitle: 'Progress tracking will appear once lessons, quizzes, and exams are recorded.',
          ),
        ],
      ),
    );
  }
}
