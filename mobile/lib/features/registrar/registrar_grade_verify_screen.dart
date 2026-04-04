import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class RegistrarGradeVerifyScreen extends StatefulWidget {
  const RegistrarGradeVerifyScreen({super.key});

  @override
  State<RegistrarGradeVerifyScreen> createState() =>
      _RegistrarGradeVerifyScreenState();
}

class _RegistrarGradeVerifyScreenState
    extends State<RegistrarGradeVerifyScreen>
    with SingleTickerProviderStateMixin {
  List<dynamic> _grades = [];
  bool _loading = true;
  String _activeTab = 'under_review';
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this)
      ..addListener(() {
        if (!_tabController.indexIsChanging) return;
        setState(() {
          _activeTab = ['under_review', 'submitted', 'official'][_tabController.index];
        });
        _load();
      });
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/grades', queryParameters: {
        'submission_status': _activeTab,
        'limit': 100,
      });
      if (!mounted) return;
      setState(() {
        _grades = res.data['data'] as List? ?? [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOne(Map<String, dynamic> grade) async {
    try {
      await ApiClient().dio.post('/grades/${grade['id']}/verify');
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Grade verified and marked as Official.'),
          backgroundColor: AppTheme.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _verifyAll() async {
    if (_grades.isEmpty) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Verify All Grades'),
        content: Text(
          'Verify and mark ${_grades.length} grade(s) as Official?\n\n'
          'Students will be able to see their final grades after this.',
        ),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.success),
            child: const Text('Verify All'),
          ),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await ApiClient().dio.post('/grades/batch-verify', data: {
        'ids': _grades.map((g) => g['id']).toList(),
      });
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content:
              Text('${_grades.length} grade(s) verified and set to Official.'),
          backgroundColor: AppTheme.success,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final canVerify = (_activeTab == 'under_review' || _activeTab == 'submitted');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Grade Verification'),
        actions: [
          if (canVerify && _grades.isNotEmpty)
            TextButton.icon(
              onPressed: _verifyAll,
              icon: const Icon(Icons.verified_rounded,
                  size: 18, color: Colors.white),
              label: const Text('Verify All',
                  style: TextStyle(color: Colors.white, fontSize: 13)),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          isScrollable: false,
          tabs: const [
            Tab(text: 'For Review'),
            Tab(text: 'Submitted'),
            Tab(text: 'Official'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _GradeVerifyList(
            loading: _loading,
            grades: _grades,
            onLoad: _load,
            showVerifyButton: true,
            onVerify: _verifyOne,
          ),
          _GradeVerifyList(
            loading: _loading,
            grades: _grades,
            onLoad: _load,
            showVerifyButton: true,
            onVerify: _verifyOne,
          ),
          _GradeVerifyList(
            loading: _loading,
            grades: _grades,
            onLoad: _load,
            showVerifyButton: false,
            onVerify: null,
          ),
        ],
      ),
    );
  }
}

class _GradeVerifyList extends StatelessWidget {
  final bool loading;
  final List<dynamic> grades;
  final Future<void> Function() onLoad;
  final bool showVerifyButton;
  final Future<void> Function(Map<String, dynamic>)? onVerify;

  const _GradeVerifyList({
    required this.loading,
    required this.grades,
    required this.onLoad,
    required this.showVerifyButton,
    required this.onVerify,
  });

  Color _gradeColor(dynamic grade) {
    if (grade == null) return Colors.grey.shade400;
    final v = double.tryParse(grade.toString()) ?? 0;
    if (v == 5.0) return AppTheme.danger;
    if (v <= 2.0) return AppTheme.success;
    if (v <= 3.0) return AppTheme.warning;
    return AppTheme.danger;
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Center(child: CircularProgressIndicator());
    if (grades.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.verified_outlined, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('No grades in this status.',
                style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: onLoad,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        itemCount: grades.length,
        itemBuilder: (context, i) {
          final g = grades[i] as Map<String, dynamic>;
          final mid = g['midterm_grade'];
          final fin = g['final_grade'];
          final isOfficial = g['submission_status'] == 'official';

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isOfficial
                    ? AppTheme.success.withValues(alpha: 0.3)
                    : Colors.grey.shade200,
                width: isOfficial ? 1.5 : 1,
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(children: [
                    CircleAvatar(
                      radius: 18,
                      backgroundColor: isOfficial
                          ? AppTheme.success.withValues(alpha: 0.1)
                          : AppTheme.primary.withValues(alpha: 0.1),
                      child: Text(
                        (g['last_name'] as String? ?? '?')[0].toUpperCase(),
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 14,
                          color: isOfficial
                              ? AppTheme.success
                              : AppTheme.primary,
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${g['last_name']}, ${g['first_name']}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                              color: Color(0xFF1E293B),
                            ),
                          ),
                          if (g['student_number'] != null)
                            Text(g['student_number'],
                                style: TextStyle(
                                    fontSize: 11, color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                    if (isOfficial)
                      const Row(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.verified_rounded,
                            size: 14, color: AppTheme.success),
                        SizedBox(width: 4),
                        Text('Official',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppTheme.success,
                              fontWeight: FontWeight.w700,
                            )),
                      ]),
                  ]),
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(children: [
                      Icon(Icons.menu_book_rounded,
                          size: 13, color: Colors.grey.shade500),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          '${g['subject_code']} — ${g['subject_name']}',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade700),
                        ),
                      ),
                      Text(
                        '${g['school_year']} · ${g['semester']} Sem',
                        style: TextStyle(
                            fontSize: 10, color: Colors.grey.shade500),
                      ),
                    ]),
                  ),
                  const SizedBox(height: 10),
                  Row(children: [
                    _GradeBadge('Midterm', mid, _gradeColor(mid)),
                    const SizedBox(width: 8),
                    _GradeBadge('Final', fin, _gradeColor(fin)),
                    if (g['remarks'] != null) ...[
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: g['remarks'] == 'passed'
                              ? AppTheme.success.withValues(alpha: 0.1)
                              : AppTheme.danger.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          (g['remarks'] as String).toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w800,
                            color: g['remarks'] == 'passed'
                                ? AppTheme.success
                                : AppTheme.danger,
                          ),
                        ),
                      ),
                    ],
                    const Spacer(),
                    if (showVerifyButton && onVerify != null)
                      SizedBox(
                        height: 34,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.verified_rounded, size: 14),
                          label: const Text('Verify',
                              style: TextStyle(fontSize: 12)),
                          onPressed: () => onVerify!(g),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppTheme.success,
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 0),
                          ),
                        ),
                      ),
                  ]),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class _GradeBadge extends StatelessWidget {
  final String label;
  final dynamic value;
  final Color color;

  const _GradeBadge(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(children: [
        Text(label,
            style: TextStyle(
                fontSize: 9,
                color: color.withValues(alpha: 0.7),
                fontWeight: FontWeight.w700)),
        const SizedBox(height: 1),
        Text(
          value != null
              ? double.parse(value.toString()).toStringAsFixed(2)
              : '—',
          style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w900, color: color),
        ),
      ]),
    );
  }
}
