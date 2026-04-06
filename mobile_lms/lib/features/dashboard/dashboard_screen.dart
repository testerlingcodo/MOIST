import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  List<dynamic> _courses = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadCourses();
    });
  }

  Future<void> _loadCourses() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses');
      final data = res.data;
      if (data is List) {
        _courses = data;
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(
        context: context,
        subtitle: 'Student Portal',
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
            onPressed: () {},
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 22),
            onPressed: () => auth.logout(),
            tooltip: 'Sign out',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: LMSTheme.maroon,
        onRefresh: _loadCourses,
        child: ListView(
          padding: const EdgeInsets.only(bottom: 32),
          children: [
            // ── Welcome strip ─────────────────────────────
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                decoration: BoxDecoration(
                  gradient: LMSTheme.maroonGradient,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: LMSTheme.maroon.withValues(alpha: 0.28),
                      blurRadius: 20, offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      width: 46, height: 46,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.16),
                        border: Border.all(
                          color: LMSTheme.goldStrong.withValues(alpha: 0.35), width: 1.5),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(8),
                        child: Image.asset('assets/images/moist-seal.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) =>
                            const Icon(Icons.person_rounded, color: Colors.white, size: 22)),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Hello, ${auth.displayName}',
                            style: const TextStyle(color: Colors.white,
                              fontSize: 15, fontWeight: FontWeight.w800),
                            maxLines: 1, overflow: TextOverflow.ellipsis),
                          const SizedBox(height: 3),
                          Text('Student  ·  ${auth.studentNumber ?? 'LMS Dashboard'}',
                            style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.72), fontSize: 11)),
                          const SizedBox(height: 3),
                          const Text('Active Semester',
                            style: TextStyle(color: LMSTheme.goldStrong,
                              fontSize: 11, fontWeight: FontWeight.w700)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 20),

            // ── Quick Access ──────────────────────────────
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: SectionHeader(title: 'Quick Access'),
            ),
            const SizedBox(height: 10),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                childAspectRatio: 1.75,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                children: [
                  FeatureTile(
                    icon: Icons.dashboard_rounded,
                    label: 'My Courses',
                    subtitle: 'All enrolled subjects',
                    color: LMSTheme.maroon,
                    bgColor: LMSTheme.paperSoft,
                    onTap: () => context.go('/courses'),
                  ),
                  FeatureTile(
                    icon: Icons.play_circle_fill_rounded,
                    label: 'Video Lessons',
                    subtitle: 'Recorded lectures',
                    color: LMSTheme.lmsBlue,
                    bgColor: const Color(0xFFEFF6FF),
                    onTap: () => context.go('/lessons/all'),
                  ),
                  FeatureTile(
                    icon: Icons.picture_as_pdf_rounded,
                    label: 'Modules',
                    subtitle: 'PDF & slide materials',
                    color: LMSTheme.danger,
                    bgColor: const Color(0xFFFFF0F0),
                    onTap: () => context.go('/modules/all'),
                  ),
                  FeatureTile(
                    icon: Icons.assignment_turned_in_rounded,
                    label: 'Assignments',
                    subtitle: 'Submit & track work',
                    color: LMSTheme.lmsGreen,
                    bgColor: const Color(0xFFECFDF5),
                    onTap: () => context.go('/assignments'),
                  ),
                  FeatureTile(
                    icon: Icons.quiz_rounded,
                    label: 'Quizzes',
                    subtitle: 'Take & review quizzes',
                    color: LMSTheme.lmsPurple,
                    bgColor: const Color(0xFFF5F3FF),
                    onTap: () => context.go('/quizzes'),
                  ),
                  FeatureTile(
                    icon: Icons.fact_check_rounded,
                    label: 'Exams',
                    subtitle: 'Scheduled assessments',
                    color: LMSTheme.maroonSoft,
                    bgColor: const Color(0xFFFFEEF1),
                    onTap: () => context.go('/exams'),
                  ),
                  FeatureTile(
                    icon: Icons.forum_rounded,
                    label: 'Discussion',
                    subtitle: 'Class conversation',
                    color: LMSTheme.warning,
                    bgColor: const Color(0xFFFFFBEB),
                    onTap: () => context.go('/discussion'),
                  ),
                  FeatureTile(
                    icon: Icons.insights_rounded,
                    label: 'Progress',
                    subtitle: 'Grades & analytics',
                    color: LMSTheme.lmsTeal,
                    bgColor: const Color(0xFFE6FFFB),
                    onTap: () => context.go('/progress'),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // ── Recent Courses ────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: SectionHeader(
                title: 'Recent Courses',
                action: TextButton(
                  onPressed: () => context.go('/courses'),
                  style: TextButton.styleFrom(foregroundColor: LMSTheme.maroon),
                  child: const Text('See all', style: TextStyle(fontSize: 13)),
                ),
              ),
            ),
            const SizedBox(height: 10),

            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator(
                    color: LMSTheme.maroon, strokeWidth: 2.5)),
              )
            else if (_courses.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: LMSEmptyState(
                  icon: Icons.school_outlined,
                  title: 'No courses yet',
                  subtitle: 'Your enrolled courses will appear here.',
                ),
              )
            else
              ...List.generate(
                _courses.length > 4 ? 4 : _courses.length,
                (i) {
                  final course = _courses[i];
                  final name = (course['title'] ?? course['name'] ?? 'Course ${i + 1}').toString();
                  final code = (course['code'] ?? '').toString();
                  final colors = [LMSTheme.maroon, LMSTheme.lmsBlue, LMSTheme.lmsGreen, LMSTheme.lmsPurple, LMSTheme.lmsTeal];
                  final clr = colors[i % colors.length];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
                    child: LMSCard(
                      onTap: () => context.go('/courses/${course['id'] ?? ''}'),
                      child: Row(
                        children: [
                          Container(
                            width: 44, height: 44,
                            decoration: BoxDecoration(
                              color: clr.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: clr.withValues(alpha: 0.20)),
                            ),
                            child: Icon(Icons.book_rounded, color: clr, size: 22),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(name,
                                  style: const TextStyle(fontWeight: FontWeight.w700,
                                    fontSize: 13, color: LMSTheme.ink),
                                  maxLines: 1, overflow: TextOverflow.ellipsis),
                                if (code.isNotEmpty) ...[
                                  const SizedBox(height: 2),
                                  Text(code, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                ],
                              ],
                            ),
                          ),
                          Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 20),
                        ],
                      ),
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }
}
