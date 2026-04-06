import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class AllSubjectModulesScreen extends StatefulWidget {
  const AllSubjectModulesScreen({super.key});

  @override
  State<AllSubjectModulesScreen> createState() => _AllSubjectModulesScreenState();
}

class _AllSubjectModulesScreenState extends State<AllSubjectModulesScreen> {
  bool _loading = true;
  List<dynamic> _subjects = [];

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
      final res = await api.get('/lms/subjects/my');
      _subjects = res.data is List ? res.data as List : <dynamic>[];
    } catch (_) {
      _subjects = [];
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Modules & Materials', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _subjects.isEmpty
                ? ListView(
                    children: const [
                      LMSEmptyState(
                        icon: Icons.picture_as_pdf_outlined,
                        title: 'No subjects yet',
                        subtitle: 'Your enrolled subjects will appear here.',
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _subjects.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final s = _subjects[i];
                      final sid = (s['subject_id'] ?? '').toString();
                      final code = (s['subject_code'] ?? '').toString();
                      final name = (s['subject_name'] ?? 'Subject').toString();
                      final tFirst = (s['teacher_first_name'] ?? '').toString();
                      final tLast = (s['teacher_last_name'] ?? '').toString();
                      final teacher = ('$tFirst $tLast').trim();
                      return LMSCard(
                        onTap: sid.isEmpty ? null : () => context.go('/modules/$sid'),
                        padding: const EdgeInsets.all(16),
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: LMSTheme.danger.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(Icons.picture_as_pdf_rounded, color: LMSTheme.danger, size: 24),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                                  const SizedBox(height: 2),
                                  Text(
                                    [if (code.isNotEmpty) code, if (teacher.isNotEmpty) teacher].join('  ·  '),
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                  ),
                                ],
                              ),
                            ),
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

