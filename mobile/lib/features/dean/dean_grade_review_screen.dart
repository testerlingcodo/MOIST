import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class DeanGradeReviewScreen extends StatefulWidget {
  const DeanGradeReviewScreen({super.key});

  @override
  State<DeanGradeReviewScreen> createState() => _DeanGradeReviewScreenState();
}

class _DeanGradeReviewScreenState extends State<DeanGradeReviewScreen>
    with SingleTickerProviderStateMixin {
  List<dynamic> _grades = [];
  bool _loading = true;
  String _activeTab = 'submitted'; // submitted | under_review
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this)
      ..addListener(() {
        if (!_tabController.indexIsChanging) return;
        setState(() => _activeTab = _tabController.index == 0 ? 'submitted' : 'under_review');
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

  Future<void> _reviewOne(Map<String, dynamic> grade) async {
    try {
      await ApiClient().dio.post('/grades/${grade['id']}/review');
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Marked as Under Review.'),
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

  Future<void> _reviewAll() async {
    if (_grades.isEmpty) return;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Review All Grades'),
        content: Text(
            'Mark all ${_grades.length} submitted grade(s) as Under Review?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          ElevatedButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Review All')),
        ],
      ),
    );

    if (confirm != true || !mounted) return;

    try {
      await ApiClient().dio.post('/grades/batch-review', data: {
        'ids': _grades.map((g) => g['id']).toList(),
      });
      _load();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('${_grades.length} grade(s) marked as Under Review.'),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Grade Review'),
        actions: [
          if (_activeTab == 'submitted' && _grades.isNotEmpty)
            TextButton.icon(
              onPressed: _reviewAll,
              icon: const Icon(Icons.done_all_rounded,
                  size: 18, color: Colors.white),
              label: const Text('Review All',
                  style: TextStyle(color: Colors.white, fontSize: 13)),
            ),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Submitted'),
            Tab(text: 'Under Review'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _GradeList(
            loading: _loading,
            grades: _grades,
            onLoad: _load,
            activeTab: 'submitted',
            onReview: _reviewOne,
          ),
          _GradeList(
            loading: _loading,
            grades: _grades,
            onLoad: _load,
            activeTab: 'under_review',
            onReview: null,
          ),
        ],
      ),
    );
  }
}

class _GradeList extends StatelessWidget {
  final bool loading;
  final List<dynamic> grades;
  final Future<void> Function() onLoad;
  final String activeTab;
  final Future<void> Function(Map<String, dynamic>)? onReview;

  const _GradeList({
    required this.loading,
    required this.grades,
    required this.onLoad,
    required this.activeTab,
    required this.onReview,
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
            Icon(Icons.grade_outlined, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text(
              activeTab == 'submitted'
                  ? 'No submitted grades to review.'
                  : 'No grades under review.',
              style: TextStyle(color: Colors.grey.shade500),
            ),
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

          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.grey.shade200),
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
                      backgroundColor: AppTheme.primary.withValues(alpha: 0.1),
                      child: Text(
                        (g['last_name'] as String? ?? '?')[0].toUpperCase(),
                        style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 14,
                            color: AppTheme.primary),
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
                                color: Color(0xFF1E293B)),
                          ),
                          if (g['student_number'] != null)
                            Text(g['student_number'],
                                style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade500)),
                        ],
                      ),
                    ),
                    if (activeTab == 'under_review')
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppTheme.warning.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Under Review',
                            style: TextStyle(
                                fontSize: 10,
                                color: AppTheme.warning,
                                fontWeight: FontWeight.w700)),
                      ),
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
                    if (onReview != null)
                      SizedBox(
                        height: 32,
                        child: ElevatedButton.icon(
                          icon: const Icon(Icons.rate_review_rounded, size: 14),
                          label: const Text('Review',
                              style: TextStyle(fontSize: 12)),
                          onPressed: () =>
                              onReview!(g),
                          style: ElevatedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 12, vertical: 0),
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
