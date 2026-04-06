import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class ExamListScreen extends StatefulWidget {
  const ExamListScreen({super.key});

  @override
  State<ExamListScreen> createState() => _ExamListScreenState();
}

class _ExamListScreenState extends State<ExamListScreen> {
  bool _loading = true;
  List<dynamic> _courses = [];
  List<dynamic> _exams = [];
  Map<String, dynamic>? _liveExam; // { exam, course, session }

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
      final courseRes = await api.get('/lms/courses');
      _courses = courseRes.data is List ? courseRes.data as List : [];

      final exams = <dynamic>[];
      Map<String, dynamic>? live;
      for (final c in _courses) {
        final cid = (c['id'] ?? '').toString();
        if (cid.isEmpty) continue;
        try {
          final examRes = await api.get('/lms/courses/$cid/exams');
          final list = examRes.data is List ? examRes.data as List : <dynamic>[];
          for (final e in list) {
            exams.add({'exam': e, 'course': c});
            try {
              final liveRes = await api.get('/lms/exams/${e['id']}/session/live');
              if (live == null &&
                  liveRes.data is Map &&
                  liveRes.data['live'] == true) {
                live = {
                  'exam': e,
                  'course': c,
                  'session': liveRes.data['session'],
                };
              }
            } catch (_) {}
          }
        } catch (_) {}
      }
      _exams = exams;
      _liveExam = live;
    } catch (_) {
      _courses = [];
      _exams = [];
      _liveExam = null;
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Exams', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  if (_liveExam != null) ...[
                    _LiveExamBanner(
                      title: (_liveExam!['exam']['title'] ?? 'Live exam').toString(),
                      courseLabel: (_liveExam!['course']['code'] ?? '').toString(),
                      onJoin: () => context.go('/exams/${_liveExam!['exam']['id']}/take'),
                    ),
                    const SizedBox(height: 20),
                  ],
                  const SectionHeader(title: 'All Exams'),
                  const SizedBox(height: 10),
                  if (_exams.isEmpty)
                    const LMSEmptyState(
                      icon: Icons.fact_check_outlined,
                      title: 'No exams yet',
                      subtitle: 'Exams will appear here when published.',
                    )
                  else
                    ..._exams.map((row) {
                      final e = row['exam'];
                      final c = row['course'];
                      final title = (e['title'] ?? 'Exam').toString();
                      final code = (c['code'] ?? '').toString();
                      final duration = e['timer_enabled'] == 1 || e['timer_enabled'] == true
                          ? '${(e['duration_minutes'] ?? '—')} min'
                          : 'No timer';
                      final attempts = (e['attempts_allowed'] ?? 1).toString();
                      final passing = (e['passing_score'] ?? 60).toString();
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: LMSCard(
                          onTap: () => context.go('/exams/${e['id']}/take'),
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    width: 44, height: 44,
                                    decoration: BoxDecoration(
                                      color: LMSTheme.warning.withValues(alpha: 0.10),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.event_rounded, color: LMSTheme.warning, size: 22),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(title, style: const TextStyle(
                                          fontSize: 14, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
                                        const SizedBox(height: 2),
                                        Text(code, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              _InfoRow(Icons.timer_rounded, 'Duration', duration),
                              const SizedBox(height: 6),
                              _InfoRow(Icons.replay_rounded, 'Attempts', '$attempts allowed'),
                              const SizedBox(height: 6),
                              _InfoRow(Icons.grade_rounded, 'Passing', '$passing%'),
                            ],
                          ),
                        ),
                      );
                    }),
                ],
              ),
      ),
    );
  }
}

class _LiveExamBanner extends StatelessWidget {
  final String title;
  final String courseLabel;
  final VoidCallback onJoin;
  const _LiveExamBanner({required this.title, required this.courseLabel, required this.onJoin});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LMSTheme.maroonGradient,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: LMSTheme.maroon.withValues(alpha: 0.25),
            blurRadius: 16, offset: const Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48, height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.live_tv_rounded, color: LMSTheme.goldStrong, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8, height: 8,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle, color: LMSTheme.success),
                    ),
                    const SizedBox(width: 6),
                    const Text('LIVE EXAM AVAILABLE',
                      style: TextStyle(color: LMSTheme.goldStrong,
                        fontSize: 10, fontWeight: FontWeight.w800, letterSpacing: 1)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(title, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w700)),
                Text('$courseLabel  ·  Tap to join',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 11)),
              ],
            ),
          ),
          GestureDetector(
            onTap: onJoin,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: LMSTheme.goldStrong,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Text('JOIN',
                style: TextStyle(color: LMSTheme.maroonDark, fontSize: 12, fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label, value;
  const _InfoRow(this.icon, this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: Colors.grey.shade400),
        const SizedBox(width: 6),
        Text('$label: ', style: TextStyle(
          fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
        Text(value, style: const TextStyle(
          fontSize: 11, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
      ],
    );
  }
}
