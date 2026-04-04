import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class MyScheduleScreen extends StatefulWidget {
  const MyScheduleScreen({super.key});

  @override
  State<MyScheduleScreen> createState() => _MyScheduleScreenState();
}

class _MyScheduleScreenState extends State<MyScheduleScreen> {
  List<Map<String, dynamic>> _enrollments = [];
  Map<String, dynamic>? _activeTerm;
  bool _loading = true;
  String? _error;
  String _selectedTerm = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final studentId = context.read<AuthService>().studentId;
      if (studentId == null) throw Exception('No student record linked.');

      // Fetch active term (optional)
      Map<String, dynamic>? activeTerm;
      try {
        final termRes = await ApiClient().dio.get('/academic-settings/active');
        if (termRes.data is Map) {
          activeTerm = Map<String, dynamic>.from(termRes.data as Map);
        }
      } catch (_) {}

      final res = await ApiClient().dio.get('/students/$studentId/enrollments');
      if (!mounted) return;

      final all = (res.data as List? ?? [])
          .where((e) => (e['status'] as String?) != 'dropped')
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();

      // Default to active term
      final defaultTerm = activeTerm != null
          ? '${activeTerm['school_year']}|${activeTerm['semester']}'
          : (all.isNotEmpty ? '${all.first['school_year']}|${all.first['semester']}' : '');

      setState(() {
        _enrollments = all;
        _activeTerm = activeTerm;
        _selectedTerm = defaultTerm;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  List<Map<String, String>> get _termOptions {
    final seen = <String>{};
    final opts = <Map<String, String>>[];
    for (final e in _enrollments) {
      final key = '${e['school_year']}|${e['semester']}';
      if (seen.add(key)) {
        opts.add({
          'key': key,
          'label': '${e['school_year']} — ${e['semester']} Semester',
        });
      }
    }
    return opts;
  }

  List<Map<String, dynamic>> get _visibleEnrollments {
    if (_selectedTerm.isEmpty) return _enrollments;
    return _enrollments
        .where((e) => '${e['school_year']}|${e['semester']}' == _selectedTerm)
        .toList();
  }

  bool _isCurrentTerm(Map<String, dynamic> e) {
    final at = _activeTerm;
    if (at == null) return false;
    return e['school_year'] == at['school_year'] && e['semester'] == at['semester'];
  }

  String _fmtTime(String? t) {
    if (t == null) return '';
    try {
      final parts = t.split(':');
      final h = int.parse(parts[0]);
      final m = parts[1];
      final ampm = h < 12 ? 'AM' : 'PM';
      final h12 = h % 12 == 0 ? 12 : h % 12;
      return '$h12:$m $ampm';
    } catch (_) { return t; }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        automaticallyImplyLeading: false,
        backgroundColor: AppTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const MoistSealBadge(size: 32),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'MOIST, INC.',
                      style: TextStyle(
                        color: AppTheme.goldStrong,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        height: 1.1,
                      ),
                    ),
                    Text(
                      'My Schedule',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline_rounded, size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      Text(_error!, textAlign: TextAlign.center,
                          style: TextStyle(color: Colors.grey.shade600)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  color: AppTheme.maroon,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 18, 16, 32),
                    children: [
                      // Header card
                      Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppTheme.maroonDark, AppTheme.maroon, AppTheme.maroonSoft],
                          ),
                          borderRadius: BorderRadius.circular(22),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.maroon.withValues(alpha: 0.22),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            const MoistSealBadge(size: 48),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'MY SCHEDULE',
                                    style: TextStyle(
                                      color: AppTheme.goldStrong.withValues(alpha: 0.92),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  const Text(
                                    'Class Schedule',
                                    style: TextStyle(
                                      color: Colors.white,
                                      fontSize: 18,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _activeTerm != null
                                        ? 'Active term: ${_activeTerm!['school_year']} — ${_activeTerm!['semester']} Semester'
                                        : 'Your enrolled class schedule per semester.',
                                    style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.78),
                                      fontSize: 11,
                                      height: 1.4,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Term selector
                      if (_termOptions.length > 1) ...[
                        AppCard(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Select Term',
                                style: TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.ink),
                              ),
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                                decoration: BoxDecoration(
                                  border: Border.all(color: AppTheme.maroon.withValues(alpha: 0.15)),
                                  borderRadius: BorderRadius.circular(14),
                                  color: AppTheme.paper,
                                ),
                                child: DropdownButton<String>(
                                  value: _selectedTerm,
                                  isExpanded: true,
                                  underline: const SizedBox.shrink(),
                                  style: const TextStyle(
                                      fontSize: 13, color: AppTheme.ink, fontWeight: FontWeight.w500),
                                  items: _termOptions
                                      .map((o) => DropdownMenuItem(
                                          value: o['key']!, child: Text(o['label']!)))
                                      .toList(),
                                  onChanged: (v) {
                                    if (v != null) setState(() => _selectedTerm = v);
                                  },
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Schedule list
                      if (_visibleEnrollments.isEmpty)
                        AppCard(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(vertical: 24),
                            child: Column(
                              children: [
                                Container(
                                  width: 54,
                                  height: 54,
                                  decoration: BoxDecoration(
                                    color: AppTheme.maroon.withValues(alpha: 0.07),
                                    borderRadius: BorderRadius.circular(16),
                                  ),
                                  child: const Icon(Icons.event_busy_rounded,
                                      color: AppTheme.maroon, size: 26),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  'No subjects for this term',
                                  style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: Colors.grey.shade700),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  'Your class schedule will appear here once you are enrolled.',
                                  textAlign: TextAlign.center,
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.grey.shade500, height: 1.4),
                                ),
                              ],
                            ),
                          ),
                        )
                      else
                        ..._visibleEnrollments.map((e) => _ScheduleCard(
                              enrollment: e,
                              isCurrentTerm: _isCurrentTerm(e),
                              fmtTime: _fmtTime,
                            )),
                    ],
                  ),
                ),
    );
  }
}

// ─── Schedule Card ───────────────────────────────────────────
class _ScheduleCard extends StatelessWidget {
  final Map<String, dynamic> enrollment;
  final bool isCurrentTerm;
  final String Function(String?) fmtTime;

  const _ScheduleCard({
    required this.enrollment,
    required this.isCurrentTerm,
    required this.fmtTime,
  });

  @override
  Widget build(BuildContext context) {
    final e = enrollment;
    final subjectName = e['subject_name'] as String? ?? e['name'] as String? ?? '';
    final code = e['code'] as String? ?? '';
    final units = e['units'];
    final section = e['section_name'] as String?;
    final room = e['room'] as String?;
    final days = e['schedule_days'] as String?;
    final start = e['start_time'] as String?;
    final end = e['end_time'] as String?;
    final teacherFirst = e['teacher_first_name'] as String?;
    final teacherLast = e['teacher_last_name'] as String?;
    final teacher = (teacherFirst != null || teacherLast != null)
        ? '${teacherFirst ?? ''} ${teacherLast ?? ''}'.trim()
        : null;

    final hasTime = start != null || end != null;
    final timeStr = hasTime
        ? '${fmtTime(start)}${end != null ? ' – ${fmtTime(end)}' : ''}'
        : null;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isCurrentTerm
              ? AppTheme.maroon.withValues(alpha: 0.18)
              : Colors.grey.shade200,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Card header (maroon strip for current term)
          if (isCurrentTerm)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
              decoration: BoxDecoration(
                color: AppTheme.maroon.withValues(alpha: 0.07),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(15)),
                border: Border(
                    bottom: BorderSide(color: AppTheme.maroon.withValues(alpha: 0.1))),
              ),
              child: Text(
                'CURRENT TERM',
                style: TextStyle(
                  fontSize: 9,
                  fontWeight: FontWeight.w800,
                  color: AppTheme.maroon.withValues(alpha: 0.8),
                  letterSpacing: 1,
                ),
              ),
            ),

          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Subject name + units + section
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        subjectName,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF111827),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '$units u',
                            style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.grey.shade600),
                          ),
                        ),
                        if (section != null) ...[
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                            decoration: BoxDecoration(
                              color: AppTheme.maroon.withValues(alpha: 0.07),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              section,
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.maroon.withValues(alpha: 0.8)),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),

                const SizedBox(height: 4),
                Text(
                  code,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),

                const SizedBox(height: 10),
                const Divider(height: 1, color: Color(0xFFF3F4F6)),
                const SizedBox(height: 10),

                // Schedule details — flex column
                Column(
                  children: [
                    if (teacher != null && teacher.isNotEmpty)
                      _ScheduleDetail(
                        icon: Icons.person_outline_rounded,
                        label: teacher,
                        color: const Color(0xFF6B7280),
                      ),
                    if (days != null || timeStr != null)
                      _ScheduleDetail(
                        icon: Icons.schedule_rounded,
                        label: [days, timeStr].where((v) => v != null).join('  ·  '),
                        color: const Color(0xFF6B7280),
                      ),
                    if (room != null)
                      _ScheduleDetail(
                        icon: Icons.room_outlined,
                        label: 'Room $room',
                        color: const Color(0xFF6B7280),
                      ),
                    if (teacher == null && days == null && room == null)
                      Text(
                        'Schedule not yet assigned',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade400,
                            fontStyle: FontStyle.italic),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ScheduleDetail extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;

  const _ScheduleDetail({required this.icon, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 14, color: color.withValues(alpha: 0.7)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: color, height: 1.3),
            ),
          ),
        ],
      ),
    );
  }
}
