import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class ManageCoursesScreen extends StatefulWidget {
  const ManageCoursesScreen({super.key});

  @override
  State<ManageCoursesScreen> createState() => _ManageCoursesScreenState();
}

class _ManageCoursesScreenState extends State<ManageCoursesScreen> {
  bool _loading = true;
  String? _error;
  List<_CourseList> _courses = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ApiClient().dio;
      final responses = await Future.wait([
        api.get('/lms/courses'),
        api.get('/teachers/me/students'),
      ]);
      final courseData = responses[0].data is List ? responses[0].data as List : <dynamic>[];
      final studentData = responses[1].data is List ? responses[1].data as List : <dynamic>[];

      final countByCourse = <String, int>{};
      for (final s in studentData) {
        final code = (s['course'] ?? '').toString().toUpperCase();
        if (code.isEmpty) continue;
        countByCourse[code] = (countByCourse[code] ?? 0) + 1;
      }

      final mapped = <_CourseList>[];
      for (final c in courseData) {
        final code = (c['code'] ?? '').toString();
        final title = (c['title'] ?? c['name'] ?? 'Untitled Course').toString();
        final students = countByCourse[code.toUpperCase()] ?? 0;
        mapped.add(
          _CourseList(
            id: (c['id'] ?? '').toString(),
            code: code,
            title: title,
            students: students,
            status: (c['is_published'] == 1 || c['is_published'] == true) ? 'active' : 'inactive',
            color: _courseColor(code),
          ),
        );
      }
      mapped.sort((a, b) => b.students.compareTo(a.students));
      _courses = mapped;
    } catch (_) {
      _error = 'Failed to load courses.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Color _courseColor(String code) {
    final idx = code.isEmpty ? 0 : code.codeUnitAt(0) % 5;
    const colors = [
      LMSTheme.maroon,
      LMSTheme.lmsBlue,
      LMSTheme.lmsGreen,
      LMSTheme.lmsPurple,
      LMSTheme.lmsTeal,
    ];
    return colors[idx];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Manage Courses', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _error != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: LMSCard(
                          child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)),
                        ),
                      ),
                    ],
                  )
                : _courses.isEmpty
                    ? ListView(
                        children: const [
                          LMSEmptyState(
                            icon: Icons.class_outlined,
                            title: 'No course yet',
                            subtitle: 'Create LMS courses first to manage classes.',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _courses.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final c = _courses[i];
                          return LMSCard(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  width: 48, height: 48,
                                  decoration: BoxDecoration(
                                    color: c.color.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(Icons.class_rounded, color: c.color, size: 24),
                                ),
                                const SizedBox(width: 14),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(c.title, style: const TextStyle(
                                        fontSize: 14, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
                                      Text(c.code, style: TextStyle(
                                        fontSize: 12, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    StatusBadge(
                                      label: c.status.toUpperCase(),
                                      color: c.status == 'active' ? LMSTheme.success : Colors.grey,
                                    ),
                                    const SizedBox(height: 4),
                                    Text('${c.students} Students', style: TextStyle(
                                      fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600)),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}

class _CourseList {
  final String id;
  final String code, title;
  final int students;
  final String status;
  final Color color;
  const _CourseList({
    required this.id,
    required this.code,
    required this.title,
    required this.students,
    required this.status,
    required this.color,
  });
}
