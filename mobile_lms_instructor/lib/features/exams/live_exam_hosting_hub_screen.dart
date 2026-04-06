import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class LiveExamHostingHubScreen extends StatefulWidget {
  const LiveExamHostingHubScreen({super.key});

  @override
  State<LiveExamHostingHubScreen> createState() =>
      _LiveExamHostingHubScreenState();
}

class _LiveExamHostingHubScreenState extends State<LiveExamHostingHubScreen> {
  bool _loading = true;
  List<dynamic> _subjects = [];
  Map<String, List<dynamic>> _examsBySubject = {};

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final api = ApiClient().dio;
      final subRes = await api.get('/lms/subjects/my');
      final subs = subRes.data is List ? subRes.data as List : <dynamic>[];
      final map = <String, List<dynamic>>{};
      for (final s in subs) {
        final sid = (s['subject_id'] ?? '').toString();
        if (sid.isEmpty) continue;
        try {
          final exRes = await api.get('/lms/subjects/$sid/exams');
          map[sid] = exRes.data is List ? exRes.data as List : <dynamic>[];
        } catch (_) {
          map[sid] = <dynamic>[];
        }
      }
      if (!mounted) return;
      setState(() {
        _subjects = subs;
        _examsBySubject = map;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(
        context: context,
        subtitle: 'Host Live Exam',
        showBack: true,
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: LMSTheme.maroon),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (_subjects.isEmpty)
                  const LMSEmptyState(
                    icon: Icons.school_outlined,
                    title: 'No handled subjects',
                    subtitle: 'Assign subjects first to host exams.',
                  )
                else
                  ..._subjects.map((s) {
                    final sid = (s['subject_id'] ?? '').toString();
                    final code = (s['subject_code'] ?? '').toString();
                    final name = (s['subject_name'] ?? '').toString();
                    final exams = _examsBySubject[sid] ?? <dynamic>[];
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: LMSCard(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              [
                                if (code.isNotEmpty) code,
                                if (name.isNotEmpty) name,
                              ].join(' - '),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            const SizedBox(height: 8),
                            if (exams.isEmpty)
                              Text(
                                'No exams created yet.',
                                style: TextStyle(color: Colors.grey.shade600),
                              )
                            else
                              ...exams.map((e) {
                                final eid = (e['id'] ?? '').toString();
                                final title = (e['title'] ?? 'Exam').toString();
                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: OutlinedButton(
                                    onPressed: eid.isEmpty
                                        ? null
                                        : () =>
                                              context.push('/exams/$eid/host'),
                                    child: Row(
                                      children: [
                                        const Icon(
                                          Icons.fact_check_rounded,
                                          size: 16,
                                        ),
                                        const SizedBox(width: 8),
                                        Expanded(child: Text(title)),
                                        const Icon(
                                          Icons.chevron_right_rounded,
                                          size: 16,
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              }),
                          ],
                        ),
                      ),
                    );
                  }),
              ],
            ),
    );
  }
}
