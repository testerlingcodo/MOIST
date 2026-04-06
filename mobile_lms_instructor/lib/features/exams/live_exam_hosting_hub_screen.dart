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
      appBar: AppBar(
        backgroundColor: LMSTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            if (context.canPop()) context.pop();
          },
        ),
        title: const Text(
          'Host Live Exam',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        actions: [
          IconButton(
            onPressed: _load,
            icon: const Icon(Icons.refresh_rounded, color: Colors.white70),
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: LMSTheme.maroon),
            )
          : RefreshIndicator(
              onRefresh: _load,
              color: LMSTheme.maroon,
              child: _subjects.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 80),
                        LMSEmptyState(
                          icon: Icons.school_outlined,
                          title: 'No handled subjects',
                          subtitle: 'Assign subjects first to host exams.',
                        ),
                      ],
                    )
                  : ListView(
                      padding: const EdgeInsets.all(16),
                      children: [
                        // Header info card
                        Container(
                          margin: const EdgeInsets.only(bottom: 20),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: LMSTheme.maroonGradient,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          child: Row(
                            children: [
                              Container(
                                width: 48,
                                height: 48,
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(14),
                                ),
                                child: const Icon(
                                  Icons.live_tv_rounded,
                                  color: LMSTheme.goldStrong,
                                  size: 24,
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Select an exam to host',
                                      style: TextStyle(
                                        color: Colors.white,
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                    const SizedBox(height: 3),
                                    Text(
                                      '${_subjects.length} subject${_subjects.length != 1 ? 's' : ''} available',
                                      style: TextStyle(
                                        color: Colors.white.withValues(
                                          alpha: 0.7,
                                        ),
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),

                        ..._subjects.map((s) {
                          final sid = (s['subject_id'] ?? '').toString();
                          final code = (s['subject_code'] ?? '').toString();
                          final name = (s['subject_name'] ?? '').toString();
                          final exams = _examsBySubject[sid] ?? <dynamic>[];
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Subject label
                                Padding(
                                  padding: const EdgeInsets.only(
                                    left: 4,
                                    bottom: 8,
                                  ),
                                  child: Row(
                                    children: [
                                      Container(
                                        width: 4,
                                        height: 16,
                                        decoration: BoxDecoration(
                                          color: LMSTheme.maroon,
                                          borderRadius: BorderRadius.circular(
                                            2,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Expanded(
                                        child: Text(
                                          [
                                            if (code.isNotEmpty) code,
                                            if (name.isNotEmpty) name,
                                          ].join(' · '),
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w800,
                                            fontSize: 13,
                                            color: LMSTheme.ink,
                                          ),
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 3,
                                        ),
                                        decoration: BoxDecoration(
                                          color: LMSTheme.maroon.withValues(
                                            alpha: 0.08,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            8,
                                          ),
                                        ),
                                        child: Text(
                                          '${exams.length} exam${exams.length != 1 ? 's' : ''}',
                                          style: const TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: LMSTheme.maroon,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                if (exams.isEmpty)
                                  LMSCard(
                                    padding: const EdgeInsets.all(14),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.inbox_outlined,
                                          size: 18,
                                          color: Colors.grey.shade400,
                                        ),
                                        const SizedBox(width: 10),
                                        Text(
                                          'No exams created yet.',
                                          style: TextStyle(
                                            color: Colors.grey.shade500,
                                            fontSize: 13,
                                          ),
                                        ),
                                      ],
                                    ),
                                  )
                                else
                                  ...exams.map((e) {
                                    final eid = (e['id'] ?? '').toString();
                                    final title =
                                        (e['title'] ?? 'Exam').toString();
                                    final duration =
                                        e['duration_minutes'] != null
                                        ? '${e['duration_minutes']} min'
                                        : null;
                                    return Padding(
                                      padding: const EdgeInsets.only(
                                        bottom: 8,
                                      ),
                                      child: Material(
                                        color: Colors.transparent,
                                        child: InkWell(
                                          borderRadius: BorderRadius.circular(
                                            14,
                                          ),
                                          onTap: eid.isEmpty
                                              ? null
                                              : () => context.push(
                                                  '/exams/$eid/host',
                                                ),
                                          child: Container(
                                            padding: const EdgeInsets.all(14),
                                            decoration: BoxDecoration(
                                              color: LMSTheme.cardBg,
                                              borderRadius:
                                                  BorderRadius.circular(14),
                                              border: Border.all(
                                                color: Colors.grey.shade200,
                                              ),
                                            ),
                                            child: Row(
                                              children: [
                                                Container(
                                                  width: 40,
                                                  height: 40,
                                                  decoration: BoxDecoration(
                                                    color: LMSTheme.warning
                                                        .withValues(alpha: 0.1),
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                      10,
                                                    ),
                                                  ),
                                                  child: const Icon(
                                                    Icons.fact_check_rounded,
                                                    color: LMSTheme.warning,
                                                    size: 20,
                                                  ),
                                                ),
                                                const SizedBox(width: 12),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Text(
                                                        title,
                                                        style: const TextStyle(
                                                          fontSize: 13,
                                                          fontWeight:
                                                              FontWeight.w700,
                                                          color: LMSTheme.ink,
                                                        ),
                                                      ),
                                                      if (duration != null) ...[
                                                        const SizedBox(
                                                          height: 2,
                                                        ),
                                                        Text(
                                                          duration,
                                                          style: TextStyle(
                                                            fontSize: 11,
                                                            color: Colors
                                                                .grey.shade500,
                                                          ),
                                                        ),
                                                      ],
                                                    ],
                                                  ),
                                                ),
                                                Container(
                                                  padding:
                                                      const EdgeInsets.all(8),
                                                  decoration: BoxDecoration(
                                                    color: LMSTheme.maroon,
                                                    borderRadius:
                                                        BorderRadius.circular(
                                                      10,
                                                    ),
                                                  ),
                                                  child: const Icon(
                                                    Icons.play_arrow_rounded,
                                                    color: Colors.white,
                                                    size: 18,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  }),
                              ],
                            ),
                          );
                        }),
                      ],
                    ),
            ),
    );
  }
}
