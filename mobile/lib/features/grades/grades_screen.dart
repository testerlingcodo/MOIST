import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class GradesScreen extends StatefulWidget {
  const GradesScreen({super.key});

  @override
  State<GradesScreen> createState() => _GradesScreenState();
}

class _GradesScreenState extends State<GradesScreen> {
  Map<String, dynamic>? _student;
  List<Map<String, dynamic>> _groups = [];
  bool _loading = true;
  String? _error;
  String? _gpa;

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
      final responses = await Future.wait([
        ApiClient().dio.get('/students/$studentId'),
        ApiClient().dio.get('/students/$studentId/enrollments'),
      ]);
      if (!mounted) return;

      final studentData = Map<String, dynamic>.from(responses[0].data as Map);
      final enrollmentsData = responses[1].data;
      final rawSubjects = enrollmentsData is Map<String, dynamic>
          ? (enrollmentsData['data'] as List? ?? const [])
          : (enrollmentsData as List? ?? const []);
      final allSubjects = List<Map<String, dynamic>>.from(rawSubjects)
          .toList();

      // Group by school_year + semester
      final map = <String, List<Map<String, dynamic>>>{};
      for (final s in allSubjects) {
        final key = '${s['school_year'] ?? ''}|${s['semester'] ?? ''}';
        map.putIfAbsent(key, () => []).add(s);
      }

      final semOrder = {'1st': 0, '2nd': 1, 'summer': 2};
      final sortedKeys = map.keys.toList()
        ..sort((a, b) {
          final pa = a.split('|');
          final pb = b.split('|');
          final yearCmp = (pb[0]).compareTo(pa[0]);
          if (yearCmp != 0) return yearCmp;
          return (semOrder[pa[1]] ?? 9).compareTo(semOrder[pb[1]] ?? 9);
        });

      final officialRows = allSubjects.where((row) => row['grade'] != null).toList();
      final totalUnits = officialRows.fold<int>(0, (sum, row) => sum + ((row['units'] as int?) ?? 0));
      final weighted = officialRows.fold<double>(
        0,
        (sum, row) => sum + ((double.tryParse('${row['grade']}') ?? 0) * ((row['units'] as int?) ?? 0)),
      );

      setState(() {
        _student = {
          'name': '${studentData['first_name'] ?? ''} ${studentData['last_name'] ?? ''}'.trim(),
          'course': studentData['course'],
          'year_level': studentData['year_level'],
          'student_number': studentData['student_number'],
        };
        _gpa = totalUnits > 0 ? (weighted / totalUnits).toStringAsFixed(2) : null;
        _groups = sortedKeys.map((k) => {
          'key': k,
          'school_year': k.split('|')[0],
          'semester': k.split('|')[1],
          'subjects': map[k]!,
        }).toList();
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = _friendlyError(e);
      });
    }
  }

  String _friendlyError(Object error) {
    if (error is DioException) {
      final data = error.response?.data;
      final serverMessage = data is Map ? data['error']?.toString() : null;
      return serverMessage ?? error.message ?? 'Failed to load grades.';
    }
    return error.toString().replaceFirst('Exception: ', '');
  }

  Color _gradeColor(dynamic grade) {
    if (grade == null) return Colors.grey.shade400;
    final v = double.tryParse(grade.toString()) ?? 0;
    if (v == 5.0) return AppTheme.danger;
    if (v <= 2.0) return AppTheme.success;
    if (v <= 3.0) return AppTheme.warning;
    return AppTheme.danger;
  }

  String _semesterLabel(String sem) {
    switch (sem) {
      case '1st': return '1st Semester';
      case '2nd': return '2nd Semester';
      case 'summer': return 'Summer Term';
      default: return sem;
    }
  }

  String? _visibleStatus(Map<String, dynamic> record) {
    final statuses = [
      record['prelim_status'],
      record['midterm_status'],
      record['semi_final_status'],
      record['final_status'],
    ].whereType<String>();
    if (statuses.contains('official')) return 'official';
    if (statuses.contains('under_review')) return 'under_review';
    if (statuses.contains('submitted')) return 'submitted';
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
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
                      'My Grades',
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
              : _groups.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.school_outlined, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No enrolled subjects yet.',
                              style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                        children: [
                          // Student + GPA header
                          Container(
                            margin: const EdgeInsets.fromLTRB(0, 16, 0, 16),
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF5a0d1a), Color(0xFF7a1324)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                              borderRadius: BorderRadius.circular(18),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Row(children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _student?['name'] ?? '',
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w800,
                                          fontSize: 16,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${_student?['course'] ?? '-'} · Year ${_student?['year_level'] ?? '-'}',
                                        style: TextStyle(
                                            color: Colors.white.withValues(alpha: 0.75), fontSize: 12),
                                      ),
                                      if (_student?['student_number'] != null)
                                        Text(
                                          _student!['student_number'],
                                          style: TextStyle(
                                              color: Colors.white.withValues(alpha: 0.55), fontSize: 11),
                                        ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.center,
                                  children: [
                                    Text(
                                      _gpa ?? '—',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 32,
                                        fontWeight: FontWeight.w900,
                                        height: 1,
                                      ),
                                    ),
                                    Text('GPA',
                                        style: TextStyle(
                                            color: Colors.white.withValues(alpha: 0.6),
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            letterSpacing: 1)),
                                  ],
                                ),
                              ]),
                            ),
                          ),

                          // Semester groups
                          for (final group in _groups) ...[
                            _SemesterSection(
                              schoolYear: group['school_year'] as String,
                              semester: _semesterLabel(group['semester'] as String),
                              subjects: group['subjects'] as List<Map<String, dynamic>>,
                              gradeColor: _gradeColor,
                              visibleStatus: _visibleStatus,
                            ),
                            const SizedBox(height: 12),
                          ],
                        ],
                      ),
                    ),
    );
  }
}

// ─── Semester Section ────────────────────────────────────────
class _SemesterSection extends StatelessWidget {
  final String schoolYear;
  final String semester;
  final List<Map<String, dynamic>> subjects;
  final Color Function(dynamic) gradeColor;
  final String? Function(Map<String, dynamic>) visibleStatus;

  const _SemesterSection({
    required this.schoolYear,
    required this.semester,
    required this.subjects,
    required this.gradeColor,
    required this.visibleStatus,
  });

  int get _totalUnits => subjects.fold(0, (s, sub) => s + ((sub['units'] as int?) ?? 0));

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Section header
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            decoration: BoxDecoration(
              color: const Color(0xFFF8FAFC),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
              border: Border(bottom: BorderSide(color: Colors.grey.shade100)),
            ),
            child: Row(children: [
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(
                  semester,
                  style: const TextStyle(
                    fontSize: 13, fontWeight: FontWeight.w800, color: Color(0xFF1E293B),
                  ),
                ),
                Text('S.Y. $schoolYear',
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
              ]),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$_totalUnits units',
                  style: const TextStyle(
                    fontSize: 11, color: AppTheme.primary, fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ]),
          ),

          // Subject cards
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 10, 12, 4),
            child: Column(
              children: subjects.map((s) => _SubjectCard(
                subject: s,
                gradeColor: gradeColor,
                visibleStatus: visibleStatus,
              )).toList(),
            ),
          ),

          // Semester GPA footer
          Builder(builder: (ctx) {
            final official = subjects
                .where((s) => s['grade_status'] == 'official' && s['final_grade'] != null)
                .toList();
            if (official.isEmpty) return const SizedBox(height: 8);
            final totalU = official.fold<int>(0, (sum, s) => sum + ((s['units'] as int?) ?? 0));
            final weighted = official.fold<double>(
                0, (sum, s) =>
                    sum + (double.tryParse(s['final_grade'].toString()) ?? 0) * ((s['units'] as int?) ?? 0));
            final semGpa = totalU > 0 ? (weighted / totalU).toStringAsFixed(2) : null;
            if (semGpa == null) return const SizedBox(height: 8);
            return Container(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 14),
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(bottom: Radius.circular(18)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Text('Semester GPA: ',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                  Text(
                    semGpa,
                    style: const TextStyle(
                      fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.primary,
                    ),
                  ),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }
}

// ─── Subject Card ────────────────────────────────────────────
class _SubjectCard extends StatelessWidget {
  final Map<String, dynamic> subject;
  final Color Function(dynamic) gradeColor;
  final String? Function(Map<String, dynamic>) visibleStatus;

  const _SubjectCard({
    required this.subject,
    required this.gradeColor,
    required this.visibleStatus,
  });

  @override
  Widget build(BuildContext context) {
    final s = subject;
    final gradeStatus = visibleStatus(s);
    final isOfficial = gradeStatus == 'official' || gradeStatus == 'under_review';
    final prelim    = s['prelim_grade'];
    final mid       = s['midterm_grade'];
    final semiFinal = s['semi_final_grade'];
    final fin       = s['grade'];
    final remarks   = s['remarks'] as String?;
    final teacherLast = s['teacher_last_name']?.toString();
    final teacherFirst = s['teacher_first_name']?.toString();
    final teacher = (teacherLast != null && teacherLast.isNotEmpty)
        ? '$teacherLast${teacherFirst != null && teacherFirst.isNotEmpty ? ', $teacherFirst' : ''}'
        : null;

    final statusLabel = gradeStatus == 'submitted'
        ? 'Under Review'
        : gradeStatus == 'under_review'
            ? 'Approved'
            : null;
    final statusColor = gradeStatus == 'submitted'
        ? AppTheme.warning
        : gradeStatus == 'under_review'
            ? const Color(0xFF2563EB)
            : null;

    final isFailed = remarks == 'failed';
    final isPassed = remarks == 'passed';

    final hasAnyGrade = isOfficial &&
        (prelim != null || mid != null || semiFinal != null || fin != null);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isFailed
            ? AppTheme.danger.withValues(alpha: 0.04)
            : const Color(0xFFF9FAFB),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFailed
              ? AppTheme.danger.withValues(alpha: 0.2)
              : isPassed
                  ? AppTheme.success.withValues(alpha: 0.2)
                  : const Color(0xFFE5E7EB),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Subject name + units
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  s['name'] ?? '',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: isFailed ? AppTheme.danger : const Color(0xFF111827),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  '${s['units'] ?? 0} u',
                  style: TextStyle(
                      fontSize: 10, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),

          const SizedBox(height: 4),

          // Code · Teacher · status badge
          Row(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                s['code'] ?? '',
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
              ),
              if (teacher != null && teacher.trim().isNotEmpty) ...[
                const SizedBox(width: 5),
                Text('·', style: TextStyle(fontSize: 11, color: Colors.grey.shade300)),
                const SizedBox(width: 5),
                Expanded(
                  child: Row(
                    children: [
                      Icon(Icons.person_outline_rounded,
                          size: 12, color: Colors.grey.shade400),
                      const SizedBox(width: 3),
                      Expanded(
                        child: Text(
                          teacher,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                        ),
                      ),
                    ],
                  ),
                ),
              ] else
                const Spacer(),
              if (statusLabel != null) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: statusColor!.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(statusLabel,
                      style: TextStyle(
                          fontSize: 9, color: statusColor, fontWeight: FontWeight.w700)),
                ),
              ],
              if (isFailed) ...[
                const SizedBox(width: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                  decoration: BoxDecoration(
                    color: AppTheme.danger.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('For Retake',
                      style: TextStyle(
                          fontSize: 9, color: AppTheme.danger, fontWeight: FontWeight.w700)),
                ),
              ],
            ],
          ),

          // Grade pills
          if (hasAnyGrade) ...[
            const SizedBox(height: 8),
            Divider(height: 1, color: Colors.grey.shade100),
            const SizedBox(height: 8),
            Row(
              children: [
                if (prelim != null)
                  _GradePill(label: 'PRELIM', value: prelim, color: gradeColor(prelim)),
                if (mid != null)
                  _GradePill(label: 'MIDTERM', value: mid, color: gradeColor(mid)),
                if (semiFinal != null)
                  _GradePill(label: 'SEMI-FINAL', value: semiFinal, color: gradeColor(semiFinal)),
                if (fin != null)
                  _GradePill(label: 'FINAL', value: fin, color: gradeColor(fin)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Grade Pill ──────────────────────────────────────────────
class _GradePill extends StatelessWidget {
  final String label;
  final dynamic value;
  final Color color;

  const _GradePill({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontSize: 8,
              color: Color(0xFF94A3B8),
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            double.parse(value.toString()).toStringAsFixed(2),
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: color),
          ),
        ],
      ),
    );
  }
}
