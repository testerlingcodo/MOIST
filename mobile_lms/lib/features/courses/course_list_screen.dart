import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class CourseListScreen extends StatefulWidget {
  const CourseListScreen({super.key});

  @override
  State<CourseListScreen> createState() => _CourseListScreenState();
}

class _CourseListScreenState extends State<CourseListScreen> {
  bool _loading = true;
  List<dynamic> _courses = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses');
      final data = res.data;
      if (data is List) _courses = data;
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'My Courses', showBack: true),
      body: RefreshIndicator(
        color: LMSTheme.maroon,
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _courses.isEmpty
                ? ListView(
                    children: const [
                      LMSEmptyState(
                        icon: Icons.school_outlined,
                        title: 'No Courses',
                        subtitle: 'You are not enrolled in any courses yet.',
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _courses.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final course = _courses[i];
                      final name = (course['title'] ?? course['name'] ?? 'Course').toString();
                      final code = (course['code'] ?? '').toString();
                      final desc = (course['description'] ?? '').toString();
                      final colors = [LMSTheme.maroon, LMSTheme.lmsBlue, LMSTheme.lmsGreen,
                                      LMSTheme.lmsPurple, LMSTheme.lmsTeal];
                      final clr = colors[i % colors.length];

                      return LMSCard(
                        onTap: () {
                          final id = (course['id'] ?? '').toString();
                          if (id.isEmpty) return;
                          context.go('/courses/$id');
                        },
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 56, height: 56,
                              decoration: BoxDecoration(
                                gradient: LinearGradient(
                                  colors: [clr.withValues(alpha: 0.18), clr.withValues(alpha: 0.06)],
                                ),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: clr.withValues(alpha: 0.15)),
                              ),
                              child: Icon(Icons.book_rounded, color: clr, size: 28),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (code.isNotEmpty)
                                    Text(code,
                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                                        color: clr, letterSpacing: 0.5)),
                                  Text(name,
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700,
                                      color: LMSTheme.ink),
                                    maxLines: 2, overflow: TextOverflow.ellipsis),
                                  if (desc.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(desc,
                                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                      maxLines: 2, overflow: TextOverflow.ellipsis),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Icon(Icons.chevron_right_rounded, color: Colors.grey.shade300, size: 22),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
