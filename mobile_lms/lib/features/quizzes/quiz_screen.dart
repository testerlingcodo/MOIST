import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class QuizScreen extends StatefulWidget {
  const QuizScreen({super.key});

  @override
  State<QuizScreen> createState() => _QuizScreenState();
}

class _QuizScreenState extends State<QuizScreen> {
  bool _loading = true;
  List<dynamic> _quizzes = []; // [{quiz, subject}]

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
          final qRes = await api.get('/lms/subjects/$sid/quizzes');
          final list = qRes.data is List ? qRes.data as List : <dynamic>[];
          for (final q in list) {
            rows.add({'quiz': q, 'subject': s});
          }
        } catch (_) {}
      }
      _quizzes = rows;
    } catch (_) {
      _quizzes = [];
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Quizzes', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _quizzes.isEmpty
                ? ListView(
                    children: const [
                      LMSEmptyState(
                        icon: Icons.quiz_outlined,
                        title: 'No quizzes yet',
                        subtitle: 'Quizzes will appear here when published.',
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _quizzes.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final row = _quizzes[i];
                      final q = row['quiz'];
                      final s = row['subject'];
                      final title = (q['title'] ?? 'Quiz').toString();
                      final code = (s['subject_code'] ?? '').toString();
                      final subjName = (s['subject_name'] ?? '').toString();
                      final tFirst = (s['teacher_first_name'] ?? '').toString();
                      final tLast = (s['teacher_last_name'] ?? '').toString();
                      final teacher = ('$tFirst $tLast').trim();
                      final passing = (q['passing_score'] ?? 60).toString();
                      final timeLimit = q['time_limit_minutes'] == null ? 'No timer' : '${q['time_limit_minutes']} min';
                      return LMSCard(
                        onTap: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Taking quizzes in-app is coming next.')),
                          );
                        },
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 48, height: 48,
                              decoration: BoxDecoration(
                                color: LMSTheme.lmsPurple.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(Icons.quiz_rounded, color: LMSTheme.lmsPurple, size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(title, style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
                                  const SizedBox(height: 2),
                                  Text(
                                    [
                                      if (code.isNotEmpty) code,
                                      if (subjName.isNotEmpty) subjName,
                                      if (teacher.isNotEmpty) teacher,
                                      timeLimit,
                                      'Passing: $passing%',
                                    ].join('  ·  '),
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                ],
                              ),
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
