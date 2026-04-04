import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class DeanEnrollmentsScreen extends StatefulWidget {
  const DeanEnrollmentsScreen({super.key});

  @override
  State<DeanEnrollmentsScreen> createState() => _DeanEnrollmentsScreenState();
}

class _DeanEnrollmentsScreenState extends State<DeanEnrollmentsScreen> {
  List<dynamic> _batches = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/enrollment-batches',
          queryParameters: {'status': 'for_evaluation', 'limit': 50});
      setState(() {
        _batches = res.data['data'] as List;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'for_evaluation': return Colors.orange;
      case 'evaluated': return Colors.blue;
      case 'approved': return AppTheme.success;
      case 'enrolled': return AppTheme.success;
      default: return Colors.grey;
    }
  }

  void _showEvaluateSheet(Map<String, dynamic> batch) async {
    List<dynamic> allSubjects = [];
    List<String> selectedIds = [];
    final deanNotesCtrl = TextEditingController(text: batch['dean_notes'] ?? '');

    // Pre-select existing subjects
    if (batch['subjects'] != null) {
      selectedIds = (batch['subjects'] as List)
          .map((s) => s['subject_id'].toString())
          .toList();
    }

    try {
      final res = await ApiClient().dio.get('/enrollment-batches/${batch['id']}/available-subjects');
      allSubjects = [
        ...(res.data['regular'] as List? ?? const []),
        ...(res.data['retakes'] as List? ?? const []),
      ];
    } catch (_) {}

    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.85,
          maxChildSize: 0.95,
          minChildSize: 0.5,
          builder: (ctx, scrollCtrl) => Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(ctx).viewInsets.bottom,
              left: 20,
              right: 20,
              top: 20,
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40, height: 4,
                    decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 16),
                const Text('Evaluate Enrollment',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B))),
                const SizedBox(height: 4),
                Text(
                  '${batch['last_name']}, ${batch['first_name']} — ${batch['school_year']} ${batch['semester']} Sem',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                ),
                const SizedBox(height: 16),
                const Text('Select Subjects',
                    style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    controller: scrollCtrl,
                    itemCount: allSubjects.length,
                    itemBuilder: (_, i) {
                      final sub = allSubjects[i] as Map<String, dynamic>;
                      final sid = sub['id'].toString();
                      final isSelected = selectedIds.contains(sid);
                      return CheckboxListTile(
                        dense: true,
                        value: isSelected,
                        title: Text('${sub['code']} — ${sub['name']}',
                            style: const TextStyle(fontSize: 13)),
                        subtitle: Text(
                          [
                            '${sub['units']} units',
                            if (sub['is_minor'] == true || sub['is_minor'] == 1)
                              'Minor: ${((sub['minor_courses'] as List?) ?? const []).join(', ')}',
                            if (sub['is_retake'] == true)
                              (sub['is_failed'] == true ? 'Failed retake' : 'Backlog'),
                          ].join(' • '),
                          style: const TextStyle(fontSize: 11),
                        ),
                        onChanged: (v) {
                          setModalState(() {
                            if (v == true) {
                              selectedIds.add(sid);
                            } else {
                              selectedIds.remove(sid);
                            }
                          });
                        },
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: deanNotesCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    labelText: 'Dean Notes',
                    alignLabelWithHint: true,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      try {
                        await ApiClient().dio.patch(
                          '/enrollment-batches/${batch['id']}/evaluate',
                          data: {
                            'subject_ids': selectedIds,
                            'dean_notes': deanNotesCtrl.text,
                          },
                        );
                        if (ctx.mounted) Navigator.pop(ctx);
                        _load();
                      } catch (e) {
                        if (ctx.mounted) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            SnackBar(
                                content: Text('Error: $e'),
                                backgroundColor: AppTheme.danger),
                          );
                        }
                      }
                    },
                    child: const Text('Submit Evaluation'),
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_batches.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.inbox_outlined, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 12),
            Text('No batches for evaluation',
                style: TextStyle(color: Colors.grey.shade500)),
          ],
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
        itemCount: _batches.length,
        itemBuilder: (context, i) {
          final b = _batches[i] as Map<String, dynamic>;
          final status = b['status'] as String? ?? '';
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              onTap: () => _showEvaluateSheet(b),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${b['last_name']}, ${b['first_name']}',
                            style: const TextStyle(
                                fontWeight: FontWeight.w600, fontSize: 14)),
                        const SizedBox(height: 2),
                        Text(b['student_number'] ?? '',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade500)),
                        const SizedBox(height: 4),
                        Text(
                            '${b['school_year']} · ${b['semester']} Sem',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: _statusColor(status).withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      status.replaceAll('_', ' ').toUpperCase(),
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: _statusColor(status)),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
