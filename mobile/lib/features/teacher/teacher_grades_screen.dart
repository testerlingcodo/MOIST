import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class TeacherGradesScreen extends StatefulWidget {
  const TeacherGradesScreen({super.key});

  @override
  State<TeacherGradesScreen> createState() => _TeacherGradesScreenState();
}

class _TeacherGradesScreenState extends State<TeacherGradesScreen> {
  Map<String, dynamic>? _workload;
  List<dynamic> _grades = [];
  bool _loading = true;
  Map<String, dynamic>? _selectedSubject; // null = subject list view
  String _search = '';
  String _filter = 'all';

  static const _phGrades = [
    {'value': 1.0, 'label': '1.00 — Excellent'},
    {'value': 1.25, 'label': '1.25 — Very Good'},
    {'value': 1.5, 'label': '1.50 — Very Good'},
    {'value': 1.75, 'label': '1.75 — Good'},
    {'value': 2.0, 'label': '2.00 — Good'},
    {'value': 2.25, 'label': '2.25 — Satisfactory'},
    {'value': 2.5, 'label': '2.50 — Satisfactory'},
    {'value': 2.75, 'label': '2.75 — Passing'},
    {'value': 3.0, 'label': '3.00 — Passing'},
    {'value': 5.0, 'label': '5.00 — Failed'},
  ];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient().dio.get('/teachers/me/workload'),
        ApiClient().dio.get('/teachers/me/students'),
      ]);
      if (!mounted) return;
      setState(() {
        _workload = Map<String, dynamic>.from(results[0].data as Map);
        _grades = results[1].data as List? ?? [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  List<dynamic> get _subjectGrades {
    if (_selectedSubject == null) return [];
    final code = _selectedSubject!['code'] as String?;
    var list = _grades.where((g) => g['subject_code'] == code).toList();
    if (_search.isNotEmpty) {
      final q = _search.toLowerCase();
      list = list.where((g) {
        final name = '${g['last_name']} ${g['first_name']}'.toLowerCase();
        final sn = (g['student_number'] ?? '').toString().toLowerCase();
        return name.contains(q) || sn.contains(q);
      }).toList();
    }
    if (_filter == 'pending') {
      list = list.where((g) => g['submission_status'] != 'submitted').toList();
    } else if (_filter == 'submitted') {
      list = list.where((g) => g['submission_status'] == 'submitted').toList();
    }
    return list;
  }

  Color _gradeColor(dynamic grade) {
    if (grade == null) return Colors.grey.shade400;
    final v = double.tryParse(grade.toString()) ?? 0;
    if (v == 5.0) return AppTheme.danger;
    if (v <= 2.0) return AppTheme.success;
    if (v <= 3.0) return AppTheme.warning;
    return AppTheme.danger;
  }

  int _subjectStudentCount(Map<String, dynamic> subject) {
    return _grades.where((g) => g['subject_code'] == subject['code']).length;
  }

  int _subjectEncodedCount(Map<String, dynamic> subject) {
    return _grades.where((g) =>
        g['subject_code'] == subject['code'] &&
        g['midterm_grade'] != null &&
        g['final_grade'] != null).length;
  }

  int _subjectSubmittedCount(Map<String, dynamic> subject) {
    return _grades.where((g) =>
        g['subject_code'] == subject['code'] &&
        g['submission_status'] == 'submitted').length;
  }

  void _showGradeSheet(Map<String, dynamic> grade) {
    final isLocked = grade['submission_status'] == 'submitted' ||
        grade['submission_status'] == 'under_review' ||
        grade['submission_status'] == 'official';
    double? midGrade = grade['midterm_grade'] != null
        ? double.tryParse(grade['midterm_grade'].toString())
        : null;
    double? finalGrade = grade['final_grade'] != null
        ? double.tryParse(grade['final_grade'].toString())
        : null;
    String remarks = grade['remarks']?.toString() ?? '';

    String autoRemarks(double? g) {
      if (g == null) return remarks;
      if (g >= 1.0 && g <= 3.0) return 'passed';
      if (g == 5.0) return 'failed';
      return remarks;
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setS) => Padding(
          padding: EdgeInsets.only(
            left: 24, right: 24, top: 12,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 28,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40, height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Row(children: [
                CircleAvatar(
                  radius: 24,
                  backgroundColor: AppTheme.maroon.withValues(alpha: 0.1),
                  child: Text(
                    (grade['last_name'] as String? ?? '?')[0].toUpperCase(),
                    style: const TextStyle(
                      fontWeight: FontWeight.w800, fontSize: 18, color: AppTheme.maroon,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${grade['last_name']}, ${grade['first_name']}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800, fontSize: 16, color: Color(0xFF1E293B),
                        ),
                      ),
                      if (grade['student_number'] != null)
                        Text('${grade['student_number']}',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
                if (isLocked)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Icon(Icons.lock_outline_rounded, size: 12, color: Colors.amber.shade800),
                      const SizedBox(width: 4),
                      Text('Locked', style: TextStyle(fontSize: 11, color: Colors.amber.shade800, fontWeight: FontWeight.w700)),
                    ]),
                  ),
              ]),
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 16),
              Row(children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Midterm', style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: Color(0xFF64748B), letterSpacing: 0.5,
                      )),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<double?>(
                        initialValue: midGrade,
                        isExpanded: true,
                        decoration: const InputDecoration(isDense: true),
                        items: [
                          const DropdownMenuItem<double?>(
                            value: null,
                            child: Text('Not encoded', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          ),
                          ..._phGrades.map((g) => DropdownMenuItem<double?>(
                            value: (g['value'] as num).toDouble(),
                            child: Text(g['label'] as String, style: const TextStyle(fontSize: 13)),
                          )),
                        ],
                        onChanged: isLocked ? null : (v) => setS(() => midGrade = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Final', style: TextStyle(
                        fontSize: 11, fontWeight: FontWeight.w700,
                        color: Color(0xFF64748B), letterSpacing: 0.5,
                      )),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<double?>(
                        initialValue: finalGrade,
                        isExpanded: true,
                        decoration: const InputDecoration(isDense: true),
                        items: [
                          const DropdownMenuItem<double?>(
                            value: null,
                            child: Text('Not encoded', style: TextStyle(color: Colors.grey, fontSize: 13)),
                          ),
                          ..._phGrades.map((g) => DropdownMenuItem<double?>(
                            value: (g['value'] as num).toDouble(),
                            child: Text(g['label'] as String, style: const TextStyle(fontSize: 13)),
                          )),
                        ],
                        onChanged: isLocked
                            ? null
                            : (v) => setS(() {
                                finalGrade = v;
                                remarks = autoRemarks(v);
                              }),
                      ),
                    ],
                  ),
                ),
              ]),
              const SizedBox(height: 16),
              const Text('Remarks', style: TextStyle(
                fontSize: 11, fontWeight: FontWeight.w700,
                color: Color(0xFF64748B), letterSpacing: 0.5,
              )),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: remarks.isEmpty ? null : remarks,
                isExpanded: true,
                decoration: const InputDecoration(isDense: true),
                items: const [
                  DropdownMenuItem(value: 'passed', child: Text('Passed')),
                  DropdownMenuItem(value: 'failed', child: Text('Failed')),
                  DropdownMenuItem(value: 'incomplete', child: Text('Incomplete')),
                  DropdownMenuItem(value: 'withdrawn', child: Text('Withdrawn')),
                ],
                onChanged: isLocked ? null : (v) => setS(() => remarks = v ?? ''),
              ),
              const SizedBox(height: 24),
              if (!isLocked)
                Row(children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Cancel'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.save_rounded, size: 16),
                      label: const Text('Save Grades'),
                      style: ElevatedButton.styleFrom(backgroundColor: AppTheme.maroon),
                      onPressed: () async {
                        try {
                          final payload = {
                            if (midGrade != null) 'midterm_grade': midGrade,
                            if (finalGrade != null) 'final_grade': finalGrade,
                            if (remarks.isNotEmpty) 'remarks': remarks,
                          };
                          if (grade['id'] != null) {
                            await ApiClient().dio.patch('/grades/${grade['id']}', data: payload);
                          } else {
                            await ApiClient().dio.post('/grades', data: {
                              'enrollment_id': grade['enrollment_id'],
                              ...payload,
                            });
                          }
                          if (ctx.mounted) Navigator.pop(ctx);
                          _load();
                        } catch (e) {
                          if (!ctx.mounted) return;
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
                          );
                        }
                      },
                    ),
                  ),
                ])
              else
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Close'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitSubjectGrades() async {
    final subGrades = _grades.where((g) =>
        g['subject_code'] == _selectedSubject!['code'] &&
        g['id'] != null &&
        g['submission_status'] != 'submitted' &&
        g['submission_status'] != 'under_review' &&
        g['submission_status'] != 'official' &&
        g['midterm_grade'] != null &&
        g['final_grade'] != null).toList();

    if (subGrades.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No complete draft grades to submit.')),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Submit Grades'),
        content: Text('Submit ${subGrades.length} grade(s) for review?\nThis cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.maroon),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;
    for (final g in subGrades) {
      try { await ApiClient().dio.post('/grades/${g['id']}/submit'); } catch (_) {}
    }
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${subGrades.length} grade(s) submitted successfully.'),
        backgroundColor: AppTheme.success,
      ),
    );
    _load();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Grade Encoding'), backgroundColor: AppTheme.maroon, foregroundColor: Colors.white),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    final subjects = (_workload?['assigned_subjects'] as List?)
        ?.cast<Map<String, dynamic>>() ?? [];

    // ── Subject list view ──
    if (_selectedSubject == null) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Grade Encoding'),
          backgroundColor: AppTheme.maroon,
          foregroundColor: Colors.white,
        ),
        body: subjects.isEmpty
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.book_outlined, size: 56, color: Colors.grey.shade300),
                    const SizedBox(height: 12),
                    Text('No subjects assigned yet.',
                        style: TextStyle(color: Colors.grey.shade500)),
                  ],
                ),
              )
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                  itemCount: subjects.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (context, i) {
                    final sub = subjects[i];
                    final total = _subjectStudentCount(sub);
                    final encoded = _subjectEncodedCount(sub);
                    final submitted = _subjectSubmittedCount(sub);
                    final progress = total > 0 ? encoded / total : 0.0;

                    return Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => setState(() {
                          _selectedSubject = sub;
                          _search = '';
                          _filter = 'all';
                        }),
                        borderRadius: BorderRadius.circular(20),
                        child: Container(
                          padding: const EdgeInsets.all(18),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF5a0d1a), Color(0xFF7a1324)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: [
                              BoxShadow(
                                color: const Color(0xFF7a1324).withValues(alpha: 0.25),
                                blurRadius: 14,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        sub['code'] ?? '',
                                        style: const TextStyle(
                                          color: Colors.white70, fontSize: 11,
                                          fontWeight: FontWeight.w800, letterSpacing: 1,
                                        ),
                                      ),
                                      const SizedBox(height: 3),
                                      Text(
                                        sub['name'] ?? '',
                                        style: const TextStyle(
                                          color: Colors.white, fontSize: 15,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                                  Text(
                                    '$encoded / $total',
                                    style: const TextStyle(
                                      color: Colors.white, fontSize: 24,
                                      fontWeight: FontWeight.w900, height: 1,
                                    ),
                                  ),
                                  Text('encoded',
                                    style: TextStyle(color: Colors.white.withValues(alpha: 0.6), fontSize: 10)),
                                ]),
                              ]),
                              const SizedBox(height: 12),
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  backgroundColor: Colors.white.withValues(alpha: 0.2),
                                  valueColor: const AlwaysStoppedAnimation(Colors.white),
                                  minHeight: 5,
                                ),
                              ),
                              const SizedBox(height: 10),
                              Row(children: [
                                _Chip('${sub['units']} units'),
                                if (sub['course'] != null) ...[
                                  const SizedBox(width: 6),
                                  _Chip(sub['course'] as String),
                                ],
                                if (sub['semester'] != null) ...[
                                  const SizedBox(width: 6),
                                  _Chip('${sub['semester']} Sem'),
                                ],
                                const Spacer(),
                                Text(
                                  '$submitted submitted',
                                  style: TextStyle(
                                    color: Colors.white.withValues(alpha: 0.7),
                                    fontSize: 11,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                Icon(Icons.chevron_right_rounded,
                                    color: Colors.white.withValues(alpha: 0.6), size: 18),
                              ]),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
      );
    }

    // ── Student list view (subject selected) ──
    final filtered = _subjectGrades;
    final total = _subjectStudentCount(_selectedSubject!);
    final encoded = _subjectEncodedCount(_selectedSubject!);
    final submitted = _subjectSubmittedCount(_selectedSubject!);

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => setState(() { _selectedSubject = null; _search = ''; _filter = 'all'; }),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(_selectedSubject!['code'] ?? '', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
            Text(_selectedSubject!['name'] ?? '',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w400),
                overflow: TextOverflow.ellipsis),
          ],
        ),
        backgroundColor: AppTheme.maroon,
        foregroundColor: Colors.white,
        actions: [
          if (_grades.any((g) =>
              g['subject_code'] == _selectedSubject!['code'] &&
              g['submission_status'] != 'submitted' &&
              g['midterm_grade'] != null &&
              g['final_grade'] != null))
            TextButton.icon(
              onPressed: _submitSubjectGrades,
              icon: const Icon(Icons.check_circle_outline_rounded, size: 16, color: Colors.white),
              label: const Text('Submit All', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
        ],
      ),
      body: Column(children: [
        // Stats bar
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
          color: AppTheme.maroon.withValues(alpha: 0.05),
          child: Row(children: [
            _StatChip('$total students', AppTheme.maroon),
            const SizedBox(width: 8),
            _StatChip('$encoded encoded', AppTheme.warning),
            const SizedBox(width: 8),
            _StatChip('$submitted submitted', AppTheme.success),
          ]),
        ),
        // Search + filter
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
          child: Row(children: [
            Expanded(
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                decoration: InputDecoration(
                  hintText: 'Search by name or number...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                  prefixIcon: Icon(Icons.search_rounded, size: 18, color: Colors.grey.shade400),
                  isDense: true,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: Colors.grey.shade200)),
                  filled: true,
                  fillColor: Colors.white,
                ),
              ),
            ),
            const SizedBox(width: 8),
            PopupMenuButton<String>(
              initialValue: _filter,
              onSelected: (v) => setState(() => _filter = v),
              itemBuilder: (_) => const [
                PopupMenuItem(value: 'all', child: Text('All Students')),
                PopupMenuItem(value: 'pending', child: Text('Not Submitted')),
                PopupMenuItem(value: 'submitted', child: Text('Submitted')),
              ],
              child: Container(
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade300),
                  borderRadius: BorderRadius.circular(10),
                  color: Colors.white,
                ),
                child: Icon(Icons.filter_list_rounded, size: 20, color: Colors.grey.shade500),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 8),
        // Student list
        Expanded(
          child: filtered.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.people_outline_rounded, size: 56, color: Colors.grey.shade300),
                      const SizedBox(height: 12),
                      Text(
                        total == 0 ? 'No students in this subject.' : 'No results found.',
                        style: TextStyle(color: Colors.grey.shade500),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 32),
                    itemCount: filtered.length,
                    itemBuilder: (context, i) {
                      final g = filtered[i] as Map<String, dynamic>;
                      final mid = g['midterm_grade'];
                      final fin = g['final_grade'];
                      final isSubmitted = g['submission_status'] == 'submitted';
                      final isLocked = isSubmitted ||
                          g['submission_status'] == 'under_review' ||
                          g['submission_status'] == 'official';
                      final bothEncoded = mid != null && fin != null;
                      final noneEncoded = mid == null && fin == null;

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Material(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          child: InkWell(
                            onTap: () => _showGradeSheet(g),
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: isLocked
                                      ? AppTheme.success.withValues(alpha: 0.2)
                                      : bothEncoded
                                          ? Colors.grey.shade200
                                          : AppTheme.warning.withValues(alpha: 0.25),
                                  width: 1,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.035),
                                    blurRadius: 8, offset: const Offset(0, 2),
                                  ),
                                ],
                              ),
                              child: Row(children: [
                                CircleAvatar(
                                  radius: 22,
                                  backgroundColor: isLocked
                                      ? AppTheme.success.withValues(alpha: 0.1)
                                      : noneEncoded
                                          ? AppTheme.warning.withValues(alpha: 0.1)
                                          : AppTheme.maroon.withValues(alpha: 0.1),
                                  child: Text(
                                    (g['last_name'] as String? ?? '?')[0].toUpperCase(),
                                    style: TextStyle(
                                      fontWeight: FontWeight.w800, fontSize: 15,
                                      color: isLocked
                                          ? AppTheme.success
                                          : noneEncoded
                                              ? AppTheme.warning
                                              : AppTheme.maroon,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${g['last_name']}, ${g['first_name']}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w700, fontSize: 13,
                                          color: Color(0xFF1E293B),
                                        ),
                                      ),
                                      if (g['student_number'] != null)
                                        Text('${g['student_number']}',
                                            style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                      const SizedBox(height: 4),
                                      if (noneEncoded)
                                        const _TagChip('Not yet encoded', AppTheme.warning)
                                      else if (isSubmitted)
                                        const _TagChip('Submitted', AppTheme.success)
                                      else if (g['submission_status'] == 'under_review')
                                        const _TagChip('Under Review', Colors.purple)
                                      else if (g['submission_status'] == 'official')
                                        const _TagChip('Official', AppTheme.success)
                                      else
                                        const _TagChip('Draft', Colors.grey),
                                    ],
                                  ),
                                ),
                                Row(mainAxisSize: MainAxisSize.min, children: [
                                  _GradePill('MID', mid, _gradeColor(mid)),
                                  const SizedBox(width: 6),
                                  _GradePill('FIN', fin, _gradeColor(fin)),
                                ]),
                              ]),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
        ),
      ]),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;
  const _Chip(this.label);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.18),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w600)),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String label;
  final Color color;
  const _StatChip(this.label, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 11, color: color, fontWeight: FontWeight.w700)),
    );
  }
}

class _TagChip extends StatelessWidget {
  final String label;
  final Color color;
  const _TagChip(this.label, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(label,
          style: TextStyle(fontSize: 10, color: color, fontWeight: FontWeight.w600)),
    );
  }
}

class _GradePill extends StatelessWidget {
  final String label;
  final dynamic value;
  final Color color;
  const _GradePill(this.label, this.value, this.color);
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(label,
            style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w700)),
        const SizedBox(height: 1),
        Text(
          value != null ? double.parse(value.toString()).toStringAsFixed(2) : '—',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color),
        ),
      ]),
    );
  }
}
