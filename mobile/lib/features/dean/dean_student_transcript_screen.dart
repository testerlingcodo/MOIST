import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class DeanStudentTranscriptScreen extends StatefulWidget {
  final String studentId;

  const DeanStudentTranscriptScreen({super.key, required this.studentId});

  @override
  State<DeanStudentTranscriptScreen> createState() =>
      _DeanStudentTranscriptScreenState();
}

class _DeanStudentTranscriptScreenState
    extends State<DeanStudentTranscriptScreen>
    with SingleTickerProviderStateMixin {
  Map<String, dynamic>? _data;
  bool _loading = true;
  String? _error;
  late TabController _tabController;

  static const _years = [1, 2, 3, 4];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _years.length, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient().dio
          .get('/students/${widget.studentId}/prospectus');
      if (!mounted) return;
      setState(() {
        _data = Map<String, dynamic>.from(res.data as Map);
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

  List<dynamic> _subjectsForYear(int year) {
    final all = (_data?['subjects'] as List?) ?? [];
    return all.where((s) => s['year_level'] == year).toList();
  }

  List<dynamic> _subjectsForSem(List<dynamic> list, String sem) =>
      list.where((s) => s['semester'] == sem).toList();

  Color _gradeColor(dynamic grade) {
    if (grade == null) return Colors.grey.shade400;
    final v = double.tryParse(grade.toString()) ?? 0;
    if (v == 5.0) return AppTheme.danger;
    if (v <= 2.0) return AppTheme.success;
    if (v <= 3.0) return AppTheme.warning;
    return AppTheme.danger;
  }

  String _gradeStr(dynamic grade) =>
      grade != null ? double.parse(grade.toString()).toStringAsFixed(2) : 'N/A';

  Widget _statusDot(Map<String, dynamic> s) {
    final gs = s['grade_status'] as String?;
    final r = s['remarks'] as String?;
    final enrolled = s['enrollment_id'] != null;

    if (!enrolled) return const SizedBox.shrink();

    Color color;
    String label;
    if (gs == 'official') {
      if (r == 'passed') { color = AppTheme.success; label = 'PASSED'; }
      else if (r == 'failed') { color = AppTheme.danger; label = 'FAILED'; }
      else if (r == 'incomplete') { color = AppTheme.warning; label = 'INC'; }
      else { color = Colors.grey; label = r?.toUpperCase() ?? ''; }
    } else if (gs != null) {
      color = AppTheme.warning; label = 'PENDING';
    } else {
      color = Colors.blue.shade300; label = 'ENROLLED';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 9, color: color, fontWeight: FontWeight.w800)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final student = _data?['student'] as Map<String, dynamic>?;
    final gpa = _data?['gpa'];

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        backgroundColor: const Color(0xFF7a1324),
        foregroundColor: Colors.white,
        title: Text(
          student != null ? student['name'] ?? 'Transcript' : 'Transcript',
          style: const TextStyle(fontSize: 15),
        ),
        bottom: _loading || _error != null
            ? null
            : TabBar(
                controller: _tabController,
                labelColor: Colors.white,
                unselectedLabelColor: Colors.white60,
                indicatorColor: Colors.amber,
                tabs: _years.map((y) => Tab(text: 'Year $y')).toList(),
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline_rounded,
                          size: 48, color: Colors.grey.shade400),
                      const SizedBox(height: 12),
                      Text(_error!,
                          style: TextStyle(color: Colors.grey.shade600)),
                      const SizedBox(height: 16),
                      ElevatedButton(onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Student header
                    Container(
                      color: const Color(0xFF5a0d1a),
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
                      child: Row(children: [
                        CircleAvatar(
                          radius: 22,
                          backgroundColor: Colors.white.withValues(alpha: 0.15),
                          child: Text(
                            (student?['name'] as String? ?? '?')
                                .split(' ').first[0].toUpperCase(),
                            style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.w800,
                                fontSize: 16),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(student?['name'] ?? '',
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.w800,
                                      fontSize: 14)),
                              Text(
                                '${student?['student_number'] ?? ''} · ${student?['course'] ?? ''}',
                                style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 11),
                              ),
                            ],
                          ),
                        ),
                        if (gpa != null)
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(gpa.toString(),
                                  style: const TextStyle(
                                      color: Colors.white,
                                      fontSize: 24,
                                      fontWeight: FontWeight.w900,
                                      height: 1)),
                              Text('Overall GPA',
                                  style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.6),
                                      fontSize: 9)),
                            ],
                          ),
                      ]),
                    ),

                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: _years.map((year) {
                          final yearSubjects = _subjectsForYear(year);

                          return RefreshIndicator(
                            onRefresh: _load,
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(16, 14, 16, 32),
                              children: [
                                for (final sem in ['1st', '2nd', 'summer']) ...[
                                  Builder(builder: (ctx) {
                                    final semSubs =
                                        _subjectsForSem(yearSubjects, sem);
                                    if (semSubs.isEmpty) {
                                      return const SizedBox.shrink();
                                    }
                                    return _SemesterCard(
                                      title: sem == '1st'
                                          ? '1st Semester'
                                          : sem == '2nd'
                                              ? '2nd Semester'
                                              : 'Summer Term',
                                      subjects: semSubs
                                          .cast<Map<String, dynamic>>(),
                                      gradeColor: _gradeColor,
                                      gradeStr: _gradeStr,
                                      statusDot: _statusDot,
                                    );
                                  }),
                                  const SizedBox(height: 12),
                                ],
                              ],
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
    );
  }
}

class _SemesterCard extends StatelessWidget {
  final String title;
  final List<Map<String, dynamic>> subjects;
  final Color Function(dynamic) gradeColor;
  final String Function(dynamic) gradeStr;
  final Widget Function(Map<String, dynamic>) statusDot;

  const _SemesterCard({
    required this.title,
    required this.subjects,
    required this.gradeColor,
    required this.gradeStr,
    required this.statusDot,
  });

  @override
  Widget build(BuildContext context) {
    final totalUnits =
        subjects.fold<int>(0, (s, sub) => s + ((sub['units'] as int?) ?? 0));
    final taken =
        subjects.where((s) => s['enrollment_id'] != null).length;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(14, 12, 14, 10),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
          ),
          child: Row(children: [
            Text(title,
                style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B))),
            const Spacer(),
            Text('$taken/${subjects.length} taken · $totalUnits units',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          ]),
        ),

        // Column labels
        const Padding(
          padding: EdgeInsets.fromLTRB(14, 8, 14, 4),
          child: Row(children: [
            Expanded(
              child: Text('Subject',
                  style: TextStyle(
                      fontSize: 9,
                      color: Color(0xFF94A3B8),
                      fontWeight: FontWeight.w700,
                      letterSpacing: 0.5)),
            ),
            _ColHeader('U', 24),
            _ColHeader('MID', 44),
            _ColHeader('FINAL', 44),
            _ColHeader('STATUS', 62),
          ]),
        ),
        const Divider(height: 1, indent: 14, endIndent: 14),

        // Rows
        ...subjects.asMap().entries.map((e) {
          final i = e.key;
          final s = e.value;
          final isLast = i == subjects.length - 1;
          final enrolled = s['enrollment_id'] != null;
          final isOfficial = s['grade_status'] == 'official';
          final mid = s['midterm_grade'];
          final fin = s['final_grade'];

          return Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          s['name'] ?? '',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: enrolled
                                ? const Color(0xFF1E293B)
                                : Colors.grey.shade400,
                          ),
                        ),
                        Text(
                          s['code'] ?? '',
                          style: TextStyle(
                              fontSize: 10, color: Colors.grey.shade400),
                        ),
                      ],
                    ),
                  ),
                  SizedBox(
                    width: 24,
                    child: Text(
                      '${s['units'] ?? ''}',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade500),
                    ),
                  ),
                  SizedBox(
                    width: 44,
                    child: Text(
                      enrolled && isOfficial ? gradeStr(mid) : '—',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: enrolled && isOfficial && mid != null
                            ? gradeColor(mid)
                            : Colors.grey.shade300,
                      ),
                    ),
                  ),
                  SizedBox(
                    width: 44,
                    child: Text(
                      enrolled && isOfficial ? gradeStr(fin) : '—',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: enrolled && isOfficial && fin != null
                            ? gradeColor(fin)
                            : Colors.grey.shade300,
                      ),
                    ),
                  ),
                  SizedBox(width: 62, child: Center(child: statusDot(s))),
                ],
              ),
            ),
            if (!isLast) const Divider(height: 1, indent: 14, endIndent: 14),
          ]);
        }),
      ]),
    );
  }
}

class _ColHeader extends StatelessWidget {
  final String label;
  final double width;
  const _ColHeader(this.label, this.width);

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Text(label,
          textAlign: TextAlign.center,
          style: TextStyle(
              fontSize: 9,
              color: Colors.grey.shade400,
              fontWeight: FontWeight.w700)),
    );
  }
}
