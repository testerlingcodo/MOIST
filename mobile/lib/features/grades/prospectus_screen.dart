import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class ProspectusScreen extends StatefulWidget {
  const ProspectusScreen({super.key});

  @override
  State<ProspectusScreen> createState() => _ProspectusScreenState();
}

class _ProspectusScreenState extends State<ProspectusScreen>
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
      final studentId = context.read<AuthService>().studentId;
      if (studentId == null) throw Exception('No student record linked.');
      final res = await ApiClient().dio.get('/students/$studentId/prospectus');
      if (!mounted) return;
      setState(() { _data = Map<String, dynamic>.from(res.data as Map); _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        if (e is DioException) {
          final data = e.response?.data;
          _error = data is Map && data['error'] != null
              ? data['error'].toString()
              : (e.message ?? 'Failed to load prospectus.');
        } else {
          _error = e.toString().replaceFirst('Exception: ', '');
        }
      });
    }
  }

  List<dynamic> _subjectsForYear(int year) {
    final subjects = _data?['subjects'] as List? ?? [];
    return subjects.where((s) => s['year_level'] == year).toList();
  }

  List<dynamic> _subjectsForSemester(List<dynamic> subjects, String sem) =>
      subjects.where((s) => s['semester'] == sem).toList();

  // Status logic
  _GradeStatus _statusOf(Map<String, dynamic> s) {
    final gradeStatus = s['grade_status'] as String?;
    final remarks = s['remarks'] as String?;
    final enrollmentId = s['enrollment_id'];

    if (enrollmentId == null) return _GradeStatus.notTaken;
    if (gradeStatus == null) return _GradeStatus.enrolled;
    if (gradeStatus == 'draft') return _GradeStatus.inProgress;
    if (gradeStatus == 'submitted') return _GradeStatus.inProgress;
    if (gradeStatus == 'under_review') return _GradeStatus.underReview;
    if (gradeStatus == 'verified') return _GradeStatus.verified;
    if (gradeStatus == 'official') {
      if (remarks == 'passed') return _GradeStatus.passed;
      if (remarks == 'failed') return _GradeStatus.failed;
      if (remarks == 'incomplete') return _GradeStatus.incomplete;
      if (remarks == 'dropped') return _GradeStatus.dropped;
      return _GradeStatus.passed;
    }
    return _GradeStatus.enrolled;
  }

  int _totalUnits(List<dynamic> subjects) =>
      subjects.fold(0, (sum, s) => sum + ((s['units'] as int?) ?? 0));

  int _passedUnits(List<dynamic> subjects) => subjects
      .where((s) => _statusOf(s as Map<String, dynamic>) == _GradeStatus.passed)
      .fold(0, (sum, s) => sum + ((s['units'] as int?) ?? 0));

  @override
  Widget build(BuildContext context) {
    final student = _data?['student'] as Map<String, dynamic>?;
    final gpa = _data?['gpa'];

    return Scaffold(
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
                      'My Prospectus',
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
        bottom: _loading || _error != null
            ? null
            : TabBar(
                controller: _tabController,
                isScrollable: false,
                tabs: _years
                    .map((y) => Tab(text: 'Year $y'))
                    .toList(),
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
                          style: TextStyle(color: Colors.grey.shade600),
                          textAlign: TextAlign.center),
                      const SizedBox(height: 16),
                      ElevatedButton(
                          onPressed: _load, child: const Text('Retry')),
                    ],
                  ),
                )
              : Column(
                  children: [
                    // Student / GPA header
                    if (student != null)
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                        decoration: const BoxDecoration(
                          gradient: LinearGradient(
                            colors: [Color(0xFF5a0d1a), Color(0xFF7a1324)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        child: Row(children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  student['name'] ?? '',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w800,
                                    fontSize: 15,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${student['course'] ?? ''} · Year ${student['year_level'] ?? '-'}',
                                  style: TextStyle(
                                      color: Colors.white.withValues(alpha: 0.75),
                                      fontSize: 12),
                                ),
                                if (student['student_number'] != null)
                                  Text(
                                    student['student_number'],
                                    style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 11),
                                  ),
                              ],
                            ),
                          ),
                          if (gpa != null)
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  gpa.toString(),
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 28,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                                Text('GPA',
                                    style: TextStyle(
                                        color: Colors.white.withValues(alpha: 0.6),
                                        fontSize: 10,
                                        fontWeight: FontWeight.w700)),
                              ],
                            ),
                        ]),
                      ),
                    // Year tabs content
                    Expanded(
                      child: TabBarView(
                        controller: _tabController,
                        children: _years.map((year) {
                          final yearSubjects = _subjectsForYear(year);
                          final totalU = _totalUnits(yearSubjects);
                          final passedU = _passedUnits(yearSubjects);
                          return RefreshIndicator(
                            onRefresh: _load,
                            child: ListView(
                              padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
                              children: [
                                // Year progress bar
                                Row(children: [
                                  Text(
                                    'Year $year',
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                  const Spacer(),
                                  Text(
                                    '$passedU / $totalU units passed',
                                    style: TextStyle(
                                        fontSize: 11, color: Colors.grey.shade500),
                                  ),
                                ]),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: totalU > 0 ? passedU / totalU : 0,
                                    backgroundColor: Colors.grey.shade200,
                                    valueColor: const AlwaysStoppedAnimation(
                                        AppTheme.success),
                                    minHeight: 6,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                for (final sem in ['1st', '2nd', 'summer']) ...[
                                  Builder(builder: (context) {
                                    final semSubjects = _subjectsForSemester(
                                        yearSubjects, sem);
                                    if (semSubjects.isEmpty) {
                                      return const SizedBox.shrink();
                                    }
                                    return Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        _SemesterHeader(
                                          label: sem == '1st'
                                              ? '1st Semester'
                                              : sem == '2nd'
                                                  ? '2nd Semester'
                                                  : 'Summer',
                                          subjects: semSubjects,
                                        ),
                                        const SizedBox(height: 8),
                                        ...semSubjects.map((s) =>
                                            _SubjectRow(
                                              subject: s as Map<String, dynamic>,
                                              status: _statusOf(s),
                                            )),
                                        const SizedBox(height: 16),
                                      ],
                                    );
                                  }),
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

enum _GradeStatus {
  notTaken,
  enrolled,
  inProgress,
  underReview,
  verified,
  passed,
  failed,
  incomplete,
  dropped,
}

class _SemesterHeader extends StatelessWidget {
  final String label;
  final List<dynamic> subjects;

  const _SemesterHeader({required this.label, required this.subjects});

  @override
  Widget build(BuildContext context) {
    final totalUnits = subjects.fold<int>(
        0, (sum, s) => sum + (((s as Map)['units'] as int?) ?? 0));
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(children: [
        const Icon(Icons.calendar_today_rounded, size: 13, color: AppTheme.primary),
        const SizedBox(width: 6),
        Text(label,
            style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w800,
                color: AppTheme.primary)),
        const Spacer(),
        Text('$totalUnits units',
            style: TextStyle(fontSize: 11, color: AppTheme.primary.withValues(alpha: 0.7))),
      ]),
    );
  }
}

class _SubjectRow extends StatelessWidget {
  final Map<String, dynamic> subject;
  final _GradeStatus status;

  const _SubjectRow({required this.subject, required this.status});

  Color get _statusColor {
    switch (status) {
      case _GradeStatus.passed: return AppTheme.success;
      case _GradeStatus.failed: return AppTheme.danger;
      case _GradeStatus.incomplete: return AppTheme.warning;
      case _GradeStatus.dropped: return Colors.grey;
      case _GradeStatus.inProgress:
      case _GradeStatus.underReview:
      case _GradeStatus.verified: return AppTheme.warning;
      case _GradeStatus.enrolled: return Colors.blue;
      case _GradeStatus.notTaken: return Colors.grey.shade400;
    }
  }

  String get _statusLabel {
    switch (status) {
      case _GradeStatus.passed: return 'PASSED';
      case _GradeStatus.failed: return 'FOR RETAKE';
      case _GradeStatus.incomplete: return 'INC';
      case _GradeStatus.dropped: return 'DROPPED';
      case _GradeStatus.inProgress: return 'IN PROGRESS';
      case _GradeStatus.underReview: return 'UNDER REVIEW';
      case _GradeStatus.verified: return 'VERIFIED';
      case _GradeStatus.enrolled: return 'ENROLLED';
      case _GradeStatus.notTaken: return 'NOT TAKEN';
    }
  }

  IconData get _statusIcon {
    switch (status) {
      case _GradeStatus.passed: return Icons.check_circle_rounded;
      case _GradeStatus.failed: return Icons.replay_rounded;
      case _GradeStatus.incomplete: return Icons.hourglass_bottom_rounded;
      case _GradeStatus.dropped: return Icons.remove_circle_outline_rounded;
      case _GradeStatus.inProgress:
      case _GradeStatus.underReview:
      case _GradeStatus.verified: return Icons.pending_rounded;
      case _GradeStatus.enrolled: return Icons.school_rounded;
      case _GradeStatus.notTaken: return Icons.radio_button_unchecked_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isFailed = status == _GradeStatus.failed;
    final gradeStatus = subject['grade_status'] as String?;
    final showGrades = gradeStatus == 'official' || gradeStatus == 'under_review';
    final finalGrade = subject['final_grade'];
    final midGrade = subject['midterm_grade'];

    // Dean's schedule info
    final teacher = subject['teacher_name'] as String?;
    final section = subject['section_name'] as String?;
    final days = subject['schedule_days'] as String?;
    final startTime = subject['start_time'] as String?;
    final endTime = subject['end_time'] as String?;
    final room = subject['room'] as String?;
    final hasSchedule = section != null || days != null || teacher != null;

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
      decoration: BoxDecoration(
        color: isFailed
            ? AppTheme.danger.withValues(alpha: 0.04)
            : Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isFailed
              ? AppTheme.danger.withValues(alpha: 0.2)
              : status == _GradeStatus.passed
                  ? AppTheme.success.withValues(alpha: 0.2)
                  : Colors.grey.shade200,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Status icon
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(_statusIcon, size: 16, color: _statusColor),
          ),
          const SizedBox(width: 10),
          // Subject info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  subject['name'] ?? '',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: isFailed ? AppTheme.danger : const Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 2),
                Wrap(
                  spacing: 6,
                  runSpacing: 2,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(
                      subject['code'] ?? '',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text('${subject['units']} u',
                          style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                    ),
                    if (section != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.maroon.withValues(alpha: 0.07),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(section,
                            style: const TextStyle(
                                fontSize: 10,
                                color: AppTheme.maroon,
                                fontWeight: FontWeight.w600)),
                      ),
                    if (isFailed)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: const Text('Must Retake',
                            style: TextStyle(
                                fontSize: 9,
                                color: AppTheme.danger,
                                fontWeight: FontWeight.w700)),
                      ),
                  ],
                ),
                // Dean's schedule info
                if (hasSchedule) ...[
                  const SizedBox(height: 5),
                  if (teacher != null && teacher.trim().isNotEmpty)
                    Row(children: [
                      Icon(Icons.person_outline_rounded, size: 11, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(teacher,
                            style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                      ),
                    ]),
                  if (days != null || startTime != null) ...[
                    const SizedBox(height: 2),
                    Row(children: [
                      Icon(Icons.schedule_rounded, size: 11, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text(
                        [
                          if (days != null) days,
                          if (startTime != null && endTime != null) '$startTime–$endTime',
                        ].join(' · '),
                        style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                      ),
                    ]),
                  ],
                  if (room != null) ...[
                    const SizedBox(height: 2),
                    Row(children: [
                      Icon(Icons.room_outlined, size: 11, color: Colors.grey.shade400),
                      const SizedBox(width: 4),
                      Text('Room $room',
                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                    ]),
                  ],
                ],
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Grade values or status badge
          if (showGrades && (midGrade != null || finalGrade != null))
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (midGrade != null)
                  _GradePill('MID',
                      double.parse(midGrade.toString()).toStringAsFixed(2),
                      _statusColor),
                if (midGrade != null && finalGrade != null)
                  const SizedBox(height: 4),
                if (finalGrade != null)
                  _GradePill('FIN',
                      double.parse(finalGrade.toString()).toStringAsFixed(2),
                      _statusColor),
              ],
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _statusColor.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                _statusLabel,
                style: TextStyle(
                    fontSize: 9,
                    color: _statusColor,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.3),
              ),
            ),
        ],
      ),
    );
  }
}

class _GradePill extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _GradePill(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(children: [
        Text(label,
            style: TextStyle(
                fontSize: 8, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w700)),
        Text(value,
            style: TextStyle(
                fontSize: 12, fontWeight: FontWeight.w900, color: color)),
      ]),
    );
  }
}
