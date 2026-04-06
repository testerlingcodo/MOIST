import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class AssignmentScreen extends StatefulWidget {
  const AssignmentScreen({super.key});

  @override
  State<AssignmentScreen> createState() => _AssignmentScreenState();
}

class _AssignmentScreenState extends State<AssignmentScreen> {
  bool _loading = true;
  List<dynamic> _assignments = []; // [{assignment, subject}]

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final api = context.read<ApiClient>().dio;
      final subRes = await api.get('/lms/subjects/my');
      final subjects = subRes.data is List ? subRes.data as List : <dynamic>[];

      final rows = <dynamic>[];
      for (final s in subjects) {
        final sid = (s['subject_id'] ?? '').toString();
        if (sid.isEmpty) continue;
        try {
          final aRes = await api.get('/lms/subjects/$sid/assignments');
          final list = aRes.data is List ? aRes.data as List : <dynamic>[];
          for (final a in list) {
            rows.add({'assignment': a, 'subject': s});
          }
        } catch (_) {}
      }
      _assignments = rows;
    } catch (_) {
      _assignments = [];
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Assignments', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _assignments.isEmpty
                ? ListView(
                    children: const [
                      LMSEmptyState(
                        icon: Icons.assignment_outlined,
                        title: 'No assignments yet',
                        subtitle: 'Assignments will appear here when posted.',
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _assignments.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final row = _assignments[i];
                      final a = row['assignment'];
                      final s = row['subject'];

                      final title = (a['title'] ?? 'Assignment').toString();
                      final code = (s['subject_code'] ?? '').toString();
                      final subjName = (s['subject_name'] ?? '').toString();
                      final tFirst = (s['teacher_first_name'] ?? '').toString();
                      final tLast = (s['teacher_last_name'] ?? '').toString();
                      final teacher = ('$tFirst $tLast').trim();
                      final due = (a['due_at'] ?? '').toString();
                      final desc = (a['instructions'] ?? '').toString();

                      final item = _Assignment(
                        title,
                        [
                          if (code.isNotEmpty) code,
                          if (subjName.isNotEmpty) subjName,
                          if (teacher.isNotEmpty) teacher,
                        ].join('  ·  '),
                        due.isEmpty ? 'No deadline' : due,
                        'pending',
                        desc.isEmpty ? 'No instructions' : desc,
                      );

                      return LMSCard(
                        onTap: () => _showDetail(context, item),
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 42, height: 42,
                                  decoration: BoxDecoration(
                                    color: item.statusColor.withValues(alpha: 0.10),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(item.statusIcon, color: item.statusColor, size: 22),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.title,
                                        style: const TextStyle(fontSize: 13,
                                          fontWeight: FontWeight.w700, color: LMSTheme.ink),
                                        maxLines: 2, overflow: TextOverflow.ellipsis),
                                      const SizedBox(height: 2),
                                      Text('${item.courseCode}  ·  Due: ${item.dueDate}',
                                        style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                ),
                                StatusBadge(label: item.statusLabel, color: item.statusColor),
                              ],
                            ),
                            const SizedBox(height: 10),
                            Text(item.description,
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              maxLines: 2, overflow: TextOverflow.ellipsis),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  void _showDetail(BuildContext context, _Assignment a) {
    showModalBottomSheet(
      context: context,
      backgroundColor: LMSTheme.cardBg,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(4))),
            ),
            const SizedBox(height: 20),
            Text(a.title, style: const TextStyle(
              fontSize: 18, fontWeight: FontWeight.w800, color: LMSTheme.ink)),
            const SizedBox(height: 8),
            Row(children: [
              StatusBadge(label: a.statusLabel, color: a.statusColor),
              const SizedBox(width: 10),
              Text('${a.courseCode}  ·  Due: ${a.dueDate}',
                style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
            ]),
            const SizedBox(height: 16),
            Text(a.description, style: TextStyle(fontSize: 13, color: Colors.grey.shade700)),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

class _Assignment {
  final String title, courseCode, dueDate, status, description;
  const _Assignment(this.title, this.courseCode, this.dueDate, this.status, this.description);

  String get statusLabel => switch (status) {
    'pending' => 'PENDING',
    'submitted' => 'SUBMITTED',
    'graded' => 'GRADED',
    _ => 'NOT STARTED',
  };

  Color get statusColor => switch (status) {
    'pending' => LMSTheme.warning,
    'submitted' => LMSTheme.lmsBlue,
    'graded' => LMSTheme.success,
    _ => Colors.grey,
  };

  IconData get statusIcon => switch (status) {
    'pending' => Icons.hourglass_bottom_rounded,
    'submitted' => Icons.cloud_done_rounded,
    'graded' => Icons.check_circle_rounded,
    _ => Icons.assignment_rounded,
  };
}
