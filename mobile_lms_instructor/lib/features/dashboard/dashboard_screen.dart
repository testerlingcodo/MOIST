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
  List<dynamic> _handledStudents = [];
  List<dynamic> _liveExams = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadDashboard());
  }

  Future<void> _loadDashboard() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>().dio;
      final results = await Future.wait([
        api.get('/lms/courses'),
        api.get('/teachers/me/students'),
      ]);
      final courseData = results[0].data;
      final studentData = results[1].data;
      _courses = courseData is List ? courseData : [];
      _handledStudents = studentData is List ? studentData : [];

      final liveExams = <dynamic>[];
      for (final c in _courses) {
        final id = (c['id'] ?? '').toString();
        if (id.isEmpty) continue;
        try {
          final examRes = await api.get('/lms/courses/$id/exams');
          final exams = examRes.data is List ? examRes.data as List : <dynamic>[];
          for (final e in exams) {
            try {
              final liveRes = await api.get('/lms/exams/${e['id']}/session/live');
              if (liveRes.data is Map && liveRes.data['live'] == true) {
                liveExams.add({
                  ...Map<String, dynamic>.from(e as Map),
                  'session': liveRes.data['session'],
                });
              }
            } catch (_) {}
          }
        } catch (_) {}
      }
      _liveExams = liveExams;
    } catch (e) {
      _error = 'Failed to load dashboard data.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  int _studentsForCourse(dynamic course) {
    final code = (course['code'] ?? '').toString().toUpperCase();
    if (code.isEmpty) return 0;
    return _handledStudents.where((s) {
      final c = (s['course'] ?? '').toString().toUpperCase();
      return c == code;
    }).length;
  }

  String _firstLiveExamId() {
    if (_liveExams.isNotEmpty) {
      return (_liveExams.first['id'] ?? '').toString();
    }
    return 'live123';
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final totalStudents = _handledStudents.map((e) => e['student_number']).toSet().length;
    final nonEmptyCourses = _courses.where((c) => _studentsForCourse(c) > 0).length;

    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(
        context: context,
        subtitle: 'Faculty Portal',
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications_outlined, color: Colors.white, size: 22),
            onPressed: () => context.push('/notifications'),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Colors.white, size: 22),
            onPressed: () => auth.logout(),
            tooltip: 'Sign out',
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: ListView(
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
                        Text(auth.displayName,
                          style: const TextStyle(color: Colors.white,
                            fontSize: 15, fontWeight: FontWeight.w800),
                          maxLines: 1, overflow: TextOverflow.ellipsis),
                        const SizedBox(height: 3),
                        Text('Instructor  ·  $totalStudents students handled',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.72), fontSize: 11)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.live_tv_rounded, color: LMSTheme.goldStrong, size: 14),
                        SizedBox(width: 6),
                        Text('HOST', style: TextStyle(
                          color: LMSTheme.goldStrong, fontSize: 11, fontWeight: FontWeight.w800)),
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),

          const SizedBox(height: 24),

          // ── Quick Actions ─────────────────────────────
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SectionHeader(title: 'Instructor Tools'),
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
                   icon: Icons.auto_stories_rounded,
                   label: 'Manage Courses',
                   subtitle: '$nonEmptyCourses with active students',
                   color: LMSTheme.maroon,
                   bgColor: LMSTheme.paperSoft,
                   onTap: () => context.go('/courses/manage'),
                 ),
                 FeatureTile(
                   icon: Icons.video_library_rounded,
                   label: 'Lessons',
                   subtitle: 'By course',
                   color: LMSTheme.lmsBlue,
                   bgColor: const Color(0xFFEFF6FF),
                   onTap: () => context.go('/courses/manage'),
                 ),
                 FeatureTile(
                   icon: Icons.quiz_rounded,
                   label: 'Quiz Builder',
                   subtitle: 'Create quizzes',
                   color: LMSTheme.lmsPurple,
                   bgColor: const Color(0xFFF5F3FF),
                   onTap: () => context.go('/quizzes/build'),
                 ),
                 FeatureTile(
                   icon: Icons.library_add_check_rounded,
                   label: 'Manage Classes',
                   subtitle: '$totalStudents students handled',
                   color: LMSTheme.lmsGreen,
                   bgColor: const Color(0xFFECFDF5),
                   onTap: () => context.go('/courses/manage'),
                 ),
                 FeatureTile(
                   icon: Icons.fact_check_rounded,
                   label: 'Create Exam',
                   subtitle: 'Setup new exam',
                   color: LMSTheme.danger,
                   bgColor: const Color(0xFFFFF0F0),
                   onTap: () => context.go('/exams/create'),
                 ),
                 FeatureTile(
                   icon: Icons.sensors_rounded,
                   label: 'Host Live Exam',
                   subtitle: _liveExams.isEmpty ? 'Start session' : '${_liveExams.length} live now',
                   color: LMSTheme.warning,
                   bgColor: const Color(0xFFFFFBEB),
                   onTap: () => context.go('/exams/${_firstLiveExamId()}/host'),
                 ),
               ],
             ),
          ),
          
          const SizedBox(height: 24),
          
          // ── Active Sessions / Pending ────────────────────────
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SectionHeader(title: 'Overview'),
          ),
          const SizedBox(height: 10),
          if (_loading)
            const Padding(
              padding: EdgeInsets.all(16),
              child: Center(child: CircularProgressIndicator(color: LMSTheme.maroon)),
            )
          else if (_error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: LMSCard(
                child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: LMSCard(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    _OverviewItem(
                      Icons.groups_rounded,
                      'Students Handled',
                      '$totalStudents active students',
                      LMSTheme.lmsGreen,
                    ),
                    const Divider(height: 24),
                    _OverviewItem(
                      Icons.class_rounded,
                      'Managed Classes',
                      '$nonEmptyCourses classes',
                      LMSTheme.lmsBlue,
                    ),
                    const Divider(height: 24),
                    _OverviewItem(
                      Icons.live_tv_rounded,
                      'Live Exam Sessions',
                      '${_liveExams.length} currently live',
                      LMSTheme.warning,
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _OverviewItem extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final Color color;
  const _OverviewItem(this.icon, this.title, this.subtitle, this.color);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(
                fontSize: 13, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
              Text(subtitle, style: TextStyle(
                fontSize: 11, color: Colors.grey.shade500)),
            ],
          ),
        ),
        Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 20),
      ],
    );
  }
}
