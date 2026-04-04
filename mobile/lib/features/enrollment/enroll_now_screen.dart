import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class EnrollNowScreen extends StatefulWidget {
  const EnrollNowScreen({super.key});

  @override
  State<EnrollNowScreen> createState() => _EnrollNowScreenState();
}

class _EnrollNowScreenState extends State<EnrollNowScreen> {
  final _schoolYearCtrl = TextEditingController();

  Map<String, dynamic>? _student;
  Map<String, dynamic>? _activeTerm;
  List<dynamic> _subjects = [];
  List<dynamic> _batches = [];
  bool _loading = true;
  bool _submitting = false;
  String _semester = '1st';

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _schoolYearCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      final studentId = auth.studentId;
      if (studentId == null) {
        throw Exception('No student account linked.');
      }

      // Fetch active academic term first
      try {
        final termRes = await ApiClient().dio.get('/academic-settings/active');
        if (termRes.data != null && termRes.data['school_year'] != null) {
          final term = Map<String, dynamic>.from(termRes.data as Map);
          _activeTerm = term;
          _schoolYearCtrl.text = term['school_year'] as String;
          _semester = term['semester'] as String? ?? '1st';
        }
      } catch (_) {
        // No active term — fallback to current year
        if (_schoolYearCtrl.text.isEmpty) {
          _schoolYearCtrl.text = '${DateTime.now().year}-${DateTime.now().year + 1}';
        }
      }

      final studentRes = await ApiClient().dio.get('/students/$studentId');
      final student = Map<String, dynamic>.from(studentRes.data as Map);
      final results = await Future.wait([
        if (_activeTerm != null)
          ApiClient().dio.get('/enrollment-batches/pre-enrollment-subjects')
        else
          ApiClient().dio.get('/subjects', queryParameters: {
            'limit': 100,
            'is_active': true,
            'is_open': true,
            'course': student['course'],
            'year_level': student['year_level'],
            'semester': _semester,
          }),
        ApiClient().dio.get('/enrollment-batches', queryParameters: {'limit': 20}),
      ]);

      if (!mounted) return;
      setState(() {
        _student = student;
        _subjects = _activeTerm != null
            ? [
                ...(results[0].data['regular'] as List? ?? const []),
                ...(results[0].data['retakes'] as List? ?? const []),
              ]
            : (results[0].data['data'] as List? ?? const []);
        _batches = results[1].data['data'] as List;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load enrollment data: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Map<String, dynamic>? get _currentActiveBatch {
    final nonDropped = _batches.where((b) => b['status'] != 'dropped').toList();
    if (nonDropped.isEmpty) return null;
    return nonDropped.first as Map<String, dynamic>;
  }

  bool get _hasActiveBatchForTerm {
    return _batches.any((batch) =>
      batch['school_year'] == _schoolYearCtrl.text.trim() &&
      batch['semester'] == _semester &&
      batch['status'] != 'dropped');
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'for_subject_enrollment':
        return 'For Subject Enrollment';
      case 'for_assessment':
        return 'For Assessment';
      case 'for_payment':
        return 'For Payment';
      case 'enrolled':
        return 'Enrolled';
      case 'dropped':
        return 'Dropped';
      default:
        return status ?? 'Unknown';
    }
  }

  int get _totalUnits {
    return _subjects.fold<int>(0, (sum, subject) => sum + ((subject['units'] ?? 0) as int));
  }

  Future<void> _submitEnrollment() async {
    if (_schoolYearCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('School year is required.')),
      );
      return;
    }
    if (_hasActiveBatchForTerm) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You already have an enrollment request for this semester.')),
      );
      return;
    }
    if (_subjects.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No open subjects found for your course and semester.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await ApiClient().dio.post('/enrollment-batches', data: {
        'school_year': _schoolYearCtrl.text.trim(),
        'semester': _semester,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Enrollment request submitted. Status is now For Evaluation.'),
          backgroundColor: AppTheme.success,
        ),
      );
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Submit failed: $e'), backgroundColor: AppTheme.danger),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending':
        return Colors.grey;
      case 'for_subject_enrollment':
        return Colors.orange;
      case 'for_assessment':
        return Colors.blue;
      case 'for_payment':
        return Colors.purple;
      case 'enrolled':
        return AppTheme.success;
      case 'dropped':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildEnrollActionButton({bool compact = false}) {
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        style: compact
            ? ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 12),
              )
            : null,
        onPressed: (_submitting || _hasActiveBatchForTerm || _subjects.isEmpty)
            ? null
            : _submitEnrollment,
        icon: _submitting
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: Colors.white,
                ),
              )
            : const Icon(Icons.playlist_add_check_rounded),
        label: Text(_submitting ? 'Submitting...' : 'Enroll Now'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final compactLayout = size.height < 760 || size.width < 380;
    final stickyEnrollAction = size.height < 860 || size.width < 430;

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
                      'Enroll Now',
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
      bottomNavigationBar: _loading || !stickyEnrollAction
          ? null
          : SafeArea(
              top: false,
              minimum: EdgeInsets.fromLTRB(
                compactLayout ? 12 : 16,
                0,
                compactLayout ? 12 : 16,
                compactLayout ? 10 : 14,
              ),
              child: AppCard(
                padding: EdgeInsets.fromLTRB(
                  compactLayout ? 10 : 12,
                  compactLayout ? 8 : 10,
                  compactLayout ? 10 : 12,
                  compactLayout ? 10 : 12,
                ),
                child: _buildEnrollActionButton(compact: compactLayout),
              ),
            ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  compactLayout ? 12 : 16,
                  compactLayout ? 12 : 16,
                  compactLayout ? 12 : 16,
                  stickyEnrollAction ? (compactLayout ? 112 : 124) : 16,
                ),
                children: [
                  if (compactLayout)
                    AppCard(
                      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Enrollment',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: AppTheme.maroon,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Loaded subjects for $_semester semester',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w800,
                                    color: AppTheme.ink,
                                  ),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Review then tap Enroll Now.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade600,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: AppTheme.paperSoft,
                              borderRadius: BorderRadius.circular(999),
                            ),
                            child: Text(
                              '${_subjects.length} subjects',
                              style: const TextStyle(
                                color: AppTheme.maroon,
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    )
                  else
                    MoistPageHeader(
                      eyebrow: 'Enrollment',
                      title: 'Loaded subjects for $_semester semester',
                      subtitle:
                          'Review your assigned offering. One request per semester only to avoid duplicate submissions.',
                      trailing: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Text(
                          '${_subjects.length} subjects',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                    ),
                  SizedBox(height: compactLayout ? 12 : 16),
                  if (_currentActiveBatch != null) ...[
                    _EnrollmentStepTracker(batch: _currentActiveBatch!),
                    SizedBox(height: compactLayout ? 12 : 16),
                  ],
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Auto-Loaded Subject Offering',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.ink),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Your course, year level, and semester subjects are loaded automatically. Review only, then tap Enroll Now.',
                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                        ),
                        const SizedBox(height: 12),
                        if (_activeTerm != null)
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppTheme.success.withValues(alpha: 0.08),
                              border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Active Academic Term', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: AppTheme.success)),
                                const SizedBox(height: 2),
                                Text(
                                  _activeTerm!['label'] as String? ?? '${_activeTerm!['school_year']} — ${_activeTerm!['semester']} Semester',
                                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.ink),
                                ),
                              ],
                            ),
                          )
                        else ...[
                          TextField(
                            controller: _schoolYearCtrl,
                            decoration: const InputDecoration(labelText: 'School Year'),
                          ),
                          const SizedBox(height: 12),
                          DropdownButtonFormField<String>(
                            initialValue: _semester,
                            decoration: const InputDecoration(labelText: 'Semester'),
                            items: const [
                              DropdownMenuItem(value: '1st', child: Text('1st Semester')),
                              DropdownMenuItem(value: '2nd', child: Text('2nd Semester')),
                              DropdownMenuItem(value: 'summer', child: Text('Summer')),
                            ],
                            onChanged: (value) {
                              setState(() => _semester = value ?? '1st');
                              _load();
                            },
                          ),
                        ],
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _Chip(label: 'Course: ${_student?['course'] ?? '-'}'),
                            _Chip(label: 'Year: ${_student?['year_level'] ?? '-'}'),
                            _Chip(label: 'Subjects: ${_subjects.length}'),
                            _Chip(label: 'Units: $_totalUnits'),
                          ],
                        ),
                        if (_hasActiveBatchForTerm) ...[
                          const SizedBox(height: 12),
                          Container(
                            width: double.infinity,
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppTheme.paperSoft,
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Text(
                              'You already submitted an enrollment request for this semester.',
                              style: TextStyle(fontSize: 12, color: AppTheme.maroon),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Subjects To Be Evaluated',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.ink),
                        ),
                        const SizedBox(height: 8),
                        if (_subjects.isEmpty)
                          Text(
                            'No open offerings for this semester yet.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          )
                        else
                          ..._subjects.map((subject) => Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: AppTheme.paper,
                                    borderRadius: BorderRadius.circular(18),
                                    border: Border.all(color: AppTheme.maroon.withValues(alpha: 0.06)),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${subject['code']} - ${subject['name']}',
                                        style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppTheme.ink),
                                      ),
                                      if (subject['is_minor'] == true || subject['is_minor'] == 1)
                                        const Padding(
                                          padding: EdgeInsets.only(top: 4),
                                          child: Text(
                                            'Minor Subject',
                                            style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.deepPurple),
                                          ),
                                        ),
                                      if (subject['is_retake'] == true)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 4),
                                          child: Text(
                                            subject['is_failed'] == true ? 'Failed retake subject' : 'Backlog subject',
                                            style: TextStyle(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w700,
                                              color: subject['is_failed'] == true ? AppTheme.danger : Colors.orange,
                                            ),
                                          ),
                                        ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${subject['units']} units • ${subject['section_name'] ?? 'TBA'} • ${subject['room'] ?? 'TBA'}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                      Text(
                                        '${subject['schedule_days'] ?? 'No days'} • ${subject['start_time'] != null && subject['end_time'] != null ? '${subject['start_time']} - ${subject['end_time']}' : 'No time'}',
                                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                      ),
                                      if (subject['prerequisite_code'] != null)
                                        Text(
                                          'Prerequisite: ${subject['prerequisite_code']}',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                        ),
                                    ],
                                  ),
                                ),
                              )),
                        if (!stickyEnrollAction) ...[
                          const SizedBox(height: 12),
                          _buildEnrollActionButton(compact: compactLayout),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),
                  const Text(
                    'My Enrollment Requests',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppTheme.ink),
                  ),
                  const SizedBox(height: 10),
                  if (_batches.isEmpty)
                    AppCard(
                      child: Text(
                        'No enrollment requests yet.',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    )
                  else
                    ..._batches.map((batch) {
                      final status = batch['status'] as String?;
                      final color = _statusColor(status);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: AppCard(
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      '${batch['school_year']} | ${batch['semester']} Sem',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 14,
                                        color: AppTheme.ink,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${batch['course'] ?? 'No course'} | Year ${batch['year_level'] ?? '-'}',
                                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                decoration: BoxDecoration(
                                  color: color.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(999),
                                ),
                                child: Text(
                                  _statusLabel(status).toUpperCase(),
                                  style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: color),
                                ),
                              ),
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

// ── Enrollment Step Tracker ───────────────────────────────────────────────────

const _kSteps = [
  {'key': 'submitted',              'label': 'Submitted',     'desc': 'Your enrollment request has been received and is being processed.'},
  {'key': 'for_subject_enrollment', 'label': 'Evaluation',    'desc': 'The Dean is reviewing your request and will assign your final subjects.'},
  {'key': 'for_assessment',         'label': 'Approval',      'desc': 'Subjects finalized. The Registrar will review and approve your enrollment.'},
  {'key': 'for_payment',            'label': 'Payment',       'desc': 'Approved! Please proceed to the Cashier\'s Office to settle your tuition fees.'},
  {'key': 'for_registration',       'label': 'Registration',  'desc': 'Payment received! Please go to the Registrar\'s Office with your receipt to be officially enrolled.'},
  {'key': 'enrolled',               'label': 'Enrolled',      'desc': 'Congratulations! You are officially enrolled.'},
];

const _kStatusToStep = {
  'pending':                0,
  'for_subject_enrollment': 1,
  'for_assessment':         2,
  'for_payment':            3,
  'for_registration':       4,
  'enrolled':               5,
};

const _kStatusMeta = {
  'pending':                {'label': 'Submitted',         'color': Color(0xFF64748B)},
  'for_subject_enrollment': {'label': 'Under Evaluation',  'color': Color(0xFF2563EB)},
  'for_assessment':         {'label': 'For Approval',      'color': Color(0xFF7C3AED)},
  'for_payment':            {'label': 'For Payment',       'color': Color(0xFFD97706)},
  'for_registration':       {'label': 'For Registration',  'color': Color(0xFF0D9488)},
  'enrolled':               {'label': 'Officially Enrolled','color': Color(0xFF16A34A)},
};

class _EnrollmentStepTracker extends StatelessWidget {
  final Map<String, dynamic> batch;
  const _EnrollmentStepTracker({required this.batch});

  @override
  Widget build(BuildContext context) {
    final status = batch['status'] as String? ?? 'pending';
    final isEnrolled = status == 'enrolled';
    final currentIdx = _kStatusToStep[status] ?? 0;
    final meta = _kStatusMeta[status] ?? _kStatusMeta['pending']!;
    final stepDesc = _kSteps[currentIdx]['desc'] as String;
    final statusLabel = meta['label'] as String;
    final statusColor = meta['color'] as Color;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: statusColor.withValues(alpha: 0.25)),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2))],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Enrollment Status', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: AppTheme.maroon, letterSpacing: 0.3)),
                    const SizedBox(height: 2),
                    Text(
                      '${batch['school_year'] ?? ''} · ${batch['semester'] ?? ''} Semester',
                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: AppTheme.ink),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: statusColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                ),
                child: Text(
                  statusLabel.toUpperCase(),
                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.w800, color: statusColor, letterSpacing: 0.5),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Step dots
          Row(
            children: List.generate(_kSteps.length, (i) {
              final done   = isEnrolled || i < currentIdx;
              final active = !isEnrolled && i == currentIdx;
              final isLast = i == _kSteps.length - 1;

              return Expanded(
                flex: isLast ? 0 : 1,
                child: Row(
                  children: [
                    // Circle
                    _StepDot(done: done, active: active, number: i + 1, isEnrolled: isEnrolled),
                    // Connector line
                    if (!isLast)
                      Expanded(
                        child: Container(
                          height: 2,
                          color: done ? AppTheme.maroon.withValues(alpha: 0.7) : Colors.grey.shade200,
                        ),
                      ),
                  ],
                ),
              );
            }),
          ),

          const SizedBox(height: 10),

          // Step labels row
          Row(
            children: List.generate(_kSteps.length, (i) {
              final done   = isEnrolled || i < currentIdx;
              final active = !isEnrolled && i == currentIdx;
              final labelColor = (done || active) ? AppTheme.maroon : Colors.grey.shade400;
              return Expanded(
                child: Text(
                  _kSteps[i]['label'] as String,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 8.5,
                    fontWeight: (active || isEnrolled) ? FontWeight.w800 : FontWeight.w600,
                    color: labelColor,
                  ),
                ),
              );
            }),
          ),

          const SizedBox(height: 12),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.07),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              stepDesc,
              style: TextStyle(fontSize: 12, color: statusColor, fontWeight: FontWeight.w600, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

class _StepDot extends StatelessWidget {
  final bool done;
  final bool active;
  final bool isEnrolled;
  final int number;
  const _StepDot({required this.done, required this.active, required this.number, required this.isEnrolled});

  @override
  Widget build(BuildContext context) {
    final bg = (done || active) ? AppTheme.maroon : Colors.grey.shade200;
    return Container(
      width: 28,
      height: 28,
      decoration: BoxDecoration(
        color: bg,
        shape: BoxShape.circle,
        border: active ? Border.all(color: AppTheme.maroon.withValues(alpha: 0.4), width: 2.5) : null,
      ),
      child: Center(
        child: done
          ? const Icon(Icons.check_rounded, size: 14, color: Colors.white)
          : active
            ? const SizedBox(
                width: 12, height: 12,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : Text('$number', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
      ),
    );
  }
}

class _Chip extends StatelessWidget {
  final String label;

  const _Chip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: AppTheme.paperSoft,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 12, color: AppTheme.maroon, fontWeight: FontWeight.w700),
      ),
    );
  }
}
