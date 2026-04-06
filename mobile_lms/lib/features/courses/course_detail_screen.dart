import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class CourseDetailScreen extends StatefulWidget {
  final String courseId;
  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> {
  bool _loadingLessons = true;
  bool _loadingModules = true;
  bool _loadingAssignments = true;
  bool _loadingQuizzes = true;

  List<dynamic> _lessons = [];
  List<dynamic> _modules = [];
  List<dynamic> _assignments = [];
  List<dynamic> _quizzes = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAll();
    });
  }

  Future<void> _loadAll() async {
    await Future.wait([
      _loadLessons(),
      _loadModules(),
      _loadAssignments(),
      _loadQuizzes(),
    ]);
  }

  Future<void> _loadLessons() async {
    setState(() => _loadingLessons = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses/${widget.courseId}/lessons');
      _lessons = res.data is List ? res.data as List : [];
    } catch (_) {
      _lessons = [];
    }
    if (!mounted) return;
    setState(() => _loadingLessons = false);
  }

  Future<void> _loadModules() async {
    setState(() => _loadingModules = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses/${widget.courseId}/lessons');
      final lessons = res.data is List ? res.data as List : [];
      _modules = lessons.where((l) {
        final t = (l['module_type'] ?? '').toString();
        final u = (l['module_url'] ?? '').toString();
        return t.isNotEmpty && u.isNotEmpty;
      }).toList();
    } catch (_) {
      _modules = [];
    }
    if (!mounted) return;
    setState(() => _loadingModules = false);
  }

  Future<void> _loadAssignments() async {
    setState(() => _loadingAssignments = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses/${widget.courseId}/assignments');
      _assignments = res.data is List ? res.data as List : [];
    } catch (_) {
      _assignments = [];
    }
    if (!mounted) return;
    setState(() => _loadingAssignments = false);
  }

  Future<void> _loadQuizzes() async {
    setState(() => _loadingQuizzes = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses/${widget.courseId}/quizzes');
      _quizzes = res.data is List ? res.data as List : [];
    } catch (_) {
      _quizzes = [];
    }
    if (!mounted) return;
    setState(() => _loadingQuizzes = false);
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        backgroundColor: LMSTheme.surface,
        appBar: AppBar(
          backgroundColor: LMSTheme.maroonDark,
          foregroundColor: Colors.white,
          elevation: 0,
          scrolledUnderElevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          ),
          title: const Text('Course Details',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
          bottom: TabBar(
            isScrollable: true,
            indicatorColor: LMSTheme.goldStrong,
            labelColor: LMSTheme.goldStrong,
            unselectedLabelColor: Colors.white60,
            labelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700),
            unselectedLabelStyle: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
            tabAlignment: TabAlignment.start,
            dividerColor: Colors.transparent,
            tabs: const [
              Tab(text: 'Lessons'),
              Tab(text: 'Modules'),
              Tab(text: 'Assignments'),
              Tab(text: 'Quizzes'),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // ── Lessons tab ──────────────────────────
            _DynamicCourseTab(
              loading: _loadingLessons,
              emptyIcon: Icons.play_circle_outline_rounded,
              emptyTitle: 'No lessons yet',
              emptySubtitle: 'Your instructor has not uploaded lessons yet.',
              items: _lessons.map((l) {
                final title = (l['title'] ?? 'Lesson').toString();
                final published = l['is_published'] == 1 || l['is_published'] == true;
                final type = (l['content_type'] ?? 'video').toString();
                final sub = published ? type.toUpperCase() : 'LOCKED';
                final color = published ? LMSTheme.lmsBlue : Colors.grey;
                return _CourseItem(title, sub, Icons.play_circle_fill_rounded, color);
              }).toList(),
              onTap: (_) => context.go('/lessons/${widget.courseId}'),
            ),

            // ── Modules tab ─────────────────────────
            _DynamicCourseTab(
              loading: _loadingModules,
              emptyIcon: Icons.picture_as_pdf_outlined,
              emptyTitle: 'No modules yet',
              emptySubtitle: 'PDFs and slides will appear here when uploaded.',
              items: _modules.map((m) {
                final title = (m['title'] ?? 'Module').toString();
                final type = (m['module_type'] ?? 'PDF').toString().toUpperCase();
                return _CourseItem(title, type, Icons.picture_as_pdf_rounded, LMSTheme.danger);
              }).toList(),
              onTap: (_) => context.go('/modules/${widget.courseId}'),
            ),

            // ── Assignments tab ─────────────────────
            _DynamicCourseTab(
              loading: _loadingAssignments,
              emptyIcon: Icons.assignment_outlined,
              emptyTitle: 'No assignments yet',
              emptySubtitle: 'Assignments will appear here when posted.',
              items: _assignments.map((a) {
                final title = (a['title'] ?? 'Assignment').toString();
                final due = (a['due_at'] ?? '').toString();
                final sub = due.isEmpty ? 'No deadline' : 'Due: $due';
                return _CourseItem(title, sub, Icons.assignment_rounded, LMSTheme.warning);
              }).toList(),
              onTap: (_) => context.go('/assignments'),
            ),

            // ── Quizzes tab ─────────────────────────
            _DynamicCourseTab(
              loading: _loadingQuizzes,
              emptyIcon: Icons.quiz_outlined,
              emptyTitle: 'No quizzes yet',
              emptySubtitle: 'Quizzes will appear here when published.',
              items: _quizzes.map((q) {
                final title = (q['title'] ?? 'Quiz').toString();
                final mins = q['time_limit_minutes'];
                final sub = mins == null ? 'No time limit' : 'Time limit: ${mins}m';
                return _CourseItem(title, sub, Icons.quiz_rounded, LMSTheme.lmsPurple);
              }).toList(),
              onTap: (_) => context.go('/quizzes'),
            ),
          ],
        ),
      ),
    );
  }
}

class _CourseItem {
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  const _CourseItem(this.title, this.subtitle, this.icon, this.color);
}

class _DynamicCourseTab extends StatelessWidget {
  final bool loading;
  final IconData emptyIcon;
  final String emptyTitle;
  final String emptySubtitle;
  final List<_CourseItem> items;
  final void Function(int) onTap;
  const _DynamicCourseTab({
    required this.loading,
    required this.emptyIcon,
    required this.emptyTitle,
    required this.emptySubtitle,
    required this.items,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) {
      return const Center(
        child: CircularProgressIndicator(color: LMSTheme.maroon),
      );
    }
    if (items.isEmpty) {
      return ListView(
        children: [
          LMSEmptyState(icon: emptyIcon, title: emptyTitle, subtitle: emptySubtitle),
        ],
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (context, i) {
        final item = items[i];
        return LMSCard(
          onTap: () => onTap(i),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  color: item.color.withValues(alpha: 0.10),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: item.color.withValues(alpha: 0.18)),
                ),
                child: Icon(item.icon, color: item.color, size: 22),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.title,
                      style: const TextStyle(fontWeight: FontWeight.w700,
                        fontSize: 13, color: LMSTheme.ink)),
                    const SizedBox(height: 2),
                    Text(item.subtitle,
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  ],
                ),
              ),
              Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 20),
            ],
          ),
        );
      },
    );
  }
}
