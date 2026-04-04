import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminGradesScreen extends StatefulWidget {
  const AdminGradesScreen({super.key});

  @override
  State<AdminGradesScreen> createState() => _AdminGradesScreenState();
}

class _AdminGradesScreenState extends State<AdminGradesScreen> {
  List<dynamic> _grades = [];
  bool _loading = true;
  String _schoolYear = '';
  String _semester = '';
  String _submissionStatus = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/grades', queryParameters: {
        'limit': 30,
        if (_schoolYear.isNotEmpty) 'school_year': _schoolYear,
        if (_semester.isNotEmpty) 'semester': _semester,
        if (_submissionStatus.isNotEmpty) 'submission_status': _submissionStatus,
      });
      if (!mounted) return;
      setState(() {
        _grades = res.data['data'] as List;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Color _gradeColor(dynamic grade) {
    if (grade == null) return Colors.grey;
    final value = double.tryParse(grade.toString()) ?? 0;
    if (value == 5.0) return AppTheme.danger;
    if (value <= 2.0) return AppTheme.success;
    if (value <= 3.0) return AppTheme.warning;
    return AppTheme.danger;
  }

  void _showEncodeDialog(Map<String, dynamic>? existing, {required bool canEdit}) {
    const phGrades = [
      {'value': 1.0, 'label': '1.00 - Excellent'},
      {'value': 1.25, 'label': '1.25 - Very Good'},
      {'value': 1.5, 'label': '1.50 - Very Good'},
      {'value': 1.75, 'label': '1.75 - Good'},
      {'value': 2.0, 'label': '2.00 - Good'},
      {'value': 2.25, 'label': '2.25 - Satisfactory'},
      {'value': 2.5, 'label': '2.50 - Satisfactory'},
      {'value': 2.75, 'label': '2.75 - Passing'},
      {'value': 3.0, 'label': '3.00 - Passing'},
      {'value': 5.0, 'label': '5.00 - Failed'},
    ];

    final enrollmentCtrl = TextEditingController(text: existing?['enrollment_id']?.toString() ?? '');
    double? midGrade = existing?['midterm_grade'] != null
        ? double.tryParse(existing!['midterm_grade'].toString())
        : null;
    double? finalGrade = existing?['final_grade'] != null
        ? double.tryParse(existing!['final_grade'].toString())
        : null;
    String remarks = existing?['remarks']?.toString() ?? '';

    String autoRemarks(double? grade) {
      if (grade == null) return '';
      if (grade >= 1.0 && grade <= 3.0) return 'passed';
      if (grade == 5.0) return 'failed';
      return '';
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                existing != null ? 'Edit Grade' : 'Encode Grade',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              if (!canEdit) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFFBEB),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'Submitted grades are locked for teachers.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF92400E)),
                  ),
                ),
              ],
              if (existing != null) ...[
                const SizedBox(height: 6),
                Text(
                  '${existing['last_name']}, ${existing['first_name']}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  '${existing['subject_code']} - ${existing['subject_name']}',
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 12),
                ),
              ],
              const SizedBox(height: 16),
              if (existing == null) ...[
                TextField(
                  controller: enrollmentCtrl,
                  decoration: const InputDecoration(labelText: 'Enrollment ID'),
                  enabled: canEdit,
                ),
                const SizedBox(height: 12),
              ],
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<double?>(
                      initialValue: midGrade,
                      decoration: const InputDecoration(labelText: 'Midterm Grade'),
                      isExpanded: true,
                      items: [
                        const DropdownMenuItem<double?>(value: null, child: Text('Not yet encoded')),
                        ...phGrades.map(
                          (grade) => DropdownMenuItem<double?>(
                            value: (grade['value'] as num).toDouble(),
                            child: Text(grade['label'] as String),
                          ),
                        ),
                      ],
                      onChanged: canEdit ? (value) => setModalState(() => midGrade = value) : null,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: DropdownButtonFormField<double?>(
                      initialValue: finalGrade,
                      decoration: const InputDecoration(labelText: 'Final Grade'),
                      isExpanded: true,
                      items: [
                        const DropdownMenuItem<double?>(value: null, child: Text('Not yet encoded')),
                        ...phGrades.map(
                          (grade) => DropdownMenuItem<double?>(
                            value: (grade['value'] as num).toDouble(),
                            child: Text(grade['label'] as String),
                          ),
                        ),
                      ],
                      onChanged: canEdit
                          ? (value) {
                              setModalState(() {
                                finalGrade = value;
                                final suggested = autoRemarks(value);
                                if (suggested.isNotEmpty) remarks = suggested;
                              });
                            }
                          : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: remarks.isEmpty ? null : remarks,
                decoration: const InputDecoration(labelText: 'Remarks'),
                items: const [
                  DropdownMenuItem(value: 'passed', child: Text('Passed')),
                  DropdownMenuItem(value: 'failed', child: Text('Failed')),
                  DropdownMenuItem(value: 'incomplete', child: Text('Incomplete')),
                  DropdownMenuItem(value: 'dropped', child: Text('Dropped')),
                ],
                onChanged: canEdit ? (value) => setModalState(() => remarks = value ?? '') : null,
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Close'),
                    ),
                  ),
                  if (canEdit) ...[
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () async {
                          try {
                            final data = {
                              if (existing == null) 'enrollment_id': enrollmentCtrl.text.trim(),
                              if (midGrade != null) 'midterm_grade': midGrade,
                              if (finalGrade != null) 'final_grade': finalGrade,
                              if (remarks.isNotEmpty) 'remarks': remarks,
                            };
                            if (existing != null) {
                              await ApiClient().dio.patch('/grades/${existing['id']}', data: data);
                            } else {
                              await ApiClient().dio.post('/grades', data: data);
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
                        child: const Text('Save Grade'),
                      ),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitGrade(Map<String, dynamic> grade) async {
    try {
      await ApiClient().dio.post('/grades/${grade['id']}/submit');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Grade submitted successfully.'),
          backgroundColor: AppTheme.success,
        ),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final canManageGrades = auth.isAdmin || auth.isTeacher;
    final canSubmitGrades = auth.isTeacher;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: AppTheme.surface,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      decoration: const InputDecoration(
                        hintText: 'School Year (2025-2026)',
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      onChanged: (value) {
                        _schoolYear = value;
                        _load();
                      },
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      decoration: const InputDecoration(
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      initialValue: _semester.isEmpty ? '' : _semester,
                      items: const [
                        DropdownMenuItem(value: '', child: Text('All')),
                        DropdownMenuItem(value: '1st', child: Text('1st Sem')),
                        DropdownMenuItem(value: '2nd', child: Text('2nd Sem')),
                        DropdownMenuItem(value: 'summer', child: Text('Summer')),
                      ],
                      onChanged: (value) {
                        _semester = value ?? '';
                        _load();
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(
                  labelText: 'Submission Status',
                  isDense: true,
                  contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                ),
                initialValue: _submissionStatus.isEmpty ? '' : _submissionStatus,
                items: const [
                  DropdownMenuItem(value: '', child: Text('All')),
                  DropdownMenuItem(value: 'draft', child: Text('Draft')),
                  DropdownMenuItem(value: 'submitted', child: Text('Submitted')),
                ],
                onChanged: (value) {
                  _submissionStatus = value ?? '';
                  _load();
                },
              ),
              if (!(auth.isAdmin || auth.isTeacher)) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'View only access. Encoding and editing grades stays with admin, staff, and teachers.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF475569)),
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _grades.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.grade_outlined, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No grades found', style: TextStyle(color: Colors.grey.shade500)),
                          if (canManageGrades) ...[
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: () => _showEncodeDialog(null, canEdit: true),
                              icon: const Icon(Icons.add_rounded, size: 18),
                              label: const Text('Encode Grade'),
                            ),
                          ],
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                        itemCount: _grades.length,
                        itemBuilder: (context, index) {
                          final grade = _grades[index] as Map<String, dynamic>;
                          final isSubmitted = grade['submission_status'] == 'submitted';
                          final teacherLocked = auth.isTeacher && isSubmitted;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              padding: const EdgeInsets.all(14),
                              onTap: canManageGrades
                                  ? () => _showEncodeDialog(grade, canEdit: !teacherLocked)
                                  : null,
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${grade['last_name']}, ${grade['first_name']}',
                                          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${grade['subject_code']} - ${grade['subject_name']}',
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                        ),
                                        Text(
                                          '${grade['school_year']} | ${grade['semester']} Sem',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 6,
                                          runSpacing: 6,
                                          children: [
                                            if (grade['remarks'] != null)
                                              StatusBadge.fromStatus(grade['remarks'] as String?),
                                            StatusBadge(
                                              label: isSubmitted ? 'SUBMITTED' : 'DRAFT',
                                              color: isSubmitted ? AppTheme.success : AppTheme.warning,
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          _MiniGrade(
                                            label: 'M',
                                            value: grade['midterm_grade'],
                                            color: _gradeColor(grade['midterm_grade']),
                                          ),
                                          const SizedBox(width: 8),
                                          _MiniGrade(
                                            label: 'F',
                                            value: grade['final_grade'],
                                            color: _gradeColor(grade['final_grade']),
                                          ),
                                        ],
                                      ),
                                      if (canSubmitGrades && !isSubmitted) ...[
                                        const SizedBox(height: 8),
                                        TextButton(
                                          onPressed: () => _submitGrade(grade),
                                          child: const Text('Submit'),
                                        ),
                                      ],
                                      if (teacherLocked) ...[
                                        const SizedBox(height: 8),
                                        Text(
                                          'Locked',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey.shade500,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
        if (canManageGrades)
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () => _showEncodeDialog(null, canEdit: true),
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Encode New Grade'),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

class _MiniGrade extends StatelessWidget {
  final String label;
  final dynamic value;
  final Color color;

  const _MiniGrade({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          label,
          style: TextStyle(fontSize: 9, color: color.withValues(alpha: 0.7), fontWeight: FontWeight.w600),
        ),
        Text(
          value != null ? double.parse(value.toString()).toStringAsFixed(2) : '-',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: color),
        ),
      ],
    );
  }
}
