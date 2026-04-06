import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class HandledStudentsScreen extends StatefulWidget {
  const HandledStudentsScreen({super.key});

  @override
  State<HandledStudentsScreen> createState() => _HandledStudentsScreenState();
}

class _HandledStudentsScreenState extends State<HandledStudentsScreen> {
  bool _loading = true;
  String? _error;
  List<Map<String, dynamic>> _students = [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>().dio;
      final res = await api.get('/teachers/me/students');
      final data = res.data;
      final rows = data is List ? data : <dynamic>[];
      _students = rows
          .map((e) => Map<String, dynamic>.from(e as Map))
          .toList();
      _students.sort((a, b) {
        final ac = (a['course'] ?? '').toString();
        final bc = (b['course'] ?? '').toString();
        final ay = (a['year_level'] ?? 0).toString();
        final by = (b['year_level'] ?? 0).toString();
        final al = (a['last_name'] ?? '').toString();
        final bl = (b['last_name'] ?? '').toString();
        final cmp1 = ac.compareTo(bc);
        if (cmp1 != 0) return cmp1;
        final cmp2 = ay.compareTo(by);
        if (cmp2 != 0) return cmp2;
        return al.compareTo(bl);
      });
    } catch (_) {
      _error = 'Failed to load handled students.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered {
    final q = _query.trim().toLowerCase();
    if (q.isEmpty) return _students;
    return _students.where((s) {
      final sn = (s['student_number'] ?? '').toString().toLowerCase();
      final first = (s['first_name'] ?? '').toString().toLowerCase();
      final last = (s['last_name'] ?? '').toString().toLowerCase();
      final course = (s['course'] ?? '').toString().toLowerCase();
      final subject = (s['subject_code'] ?? '').toString().toLowerCase();
      return sn.contains(q) || first.contains(q) || last.contains(q) || course.contains(q) || subject.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final rows = _filtered;
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Handled Students', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _error != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: LMSCard(
                          child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)),
                        ),
                      ),
                    ],
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      TextField(
                        onChanged: (v) => setState(() => _query = v),
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search_rounded),
                          hintText: 'Search student number, name, course, subject...',
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (rows.isEmpty)
                        const LMSEmptyState(
                          icon: Icons.groups_outlined,
                          title: 'No handled students',
                          subtitle: 'No enrolled students found for your assigned subjects in the active term.',
                        )
                      else ...[
                        Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: Text(
                            '${rows.length} students',
                            style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w700, fontSize: 12),
                          ),
                        ),
                        ...rows.map((s) {
                          final sn = (s['student_number'] ?? '').toString();
                          final first = (s['first_name'] ?? '').toString();
                          final last = (s['last_name'] ?? '').toString();
                          final name = ('$first $last').trim().isEmpty ? sn : ('$first $last').trim();
                          final course = (s['course'] ?? '').toString();
                          final year = (s['year_level'] ?? '').toString();
                          final subj = (s['subject_code'] ?? '').toString();
                          final subjName = (s['subject_name'] ?? '').toString();

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: LMSCard(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: BoxDecoration(
                                      color: LMSTheme.lmsGreen.withValues(alpha: 0.10),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: const Icon(Icons.person_rounded, color: LMSTheme.lmsGreen),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                                        const SizedBox(height: 2),
                                        Text(
                                          sn,
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                                        ),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 8,
                                          runSpacing: 6,
                                          children: [
                                            if (course.isNotEmpty)
                                              StatusBadge(label: year.isNotEmpty ? '$course - Y$year' : course, color: LMSTheme.lmsBlue),
                                            if (subj.isNotEmpty)
                                              StatusBadge(label: subj, color: LMSTheme.maroon),
                                          ],
                                        ),
                                        if (subjName.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Text(subjName, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                        ]
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ],
                  ),
      ),
    );
  }
}

