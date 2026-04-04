import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class RegistrarEnrollmentsScreen extends StatefulWidget {
  const RegistrarEnrollmentsScreen({super.key});

  @override
  State<RegistrarEnrollmentsScreen> createState() =>
      _RegistrarEnrollmentsScreenState();
}

class _RegistrarEnrollmentsScreenState
    extends State<RegistrarEnrollmentsScreen> {
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
          queryParameters: {'status': 'approved', 'limit': 50});
      setState(() {
        _batches = res.data['data'] as List;
        _loading = false;
      });
    } catch (_) {
      setState(() => _loading = false);
    }
  }

  Future<Map<String, dynamic>?> _fetchBatchDetail(String id) async {
    try {
      final res = await ApiClient().dio.get('/enrollment-batches/$id');
      return res.data as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  void _showDetailSheet(Map<String, dynamic> batch) async {
    final detail = await _fetchBatchDetail(batch['id'].toString());
    if (!mounted) return;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.8,
        maxChildSize: 0.95,
        minChildSize: 0.4,
        builder: (ctx, scrollCtrl) {
          if (detail == null) {
            return const Center(child: Text('Failed to load details'));
          }
          final subjects = (detail['subjects'] as List?) ?? [];
          final totalUnits = subjects.fold<int>(0, (sum, s) {
            return sum + ((s['units'] ?? 0) as int);
          });
          return Padding(
            padding: const EdgeInsets.all(20),
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
                const Text('Enrollment Details',
                    style: TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 12),
                _infoRow('Student',
                    '${detail['last_name']}, ${detail['first_name']}'),
                _infoRow('Student No.', detail['student_number'] ?? ''),
                _infoRow('Course', detail['course'] ?? ''),
                _infoRow('Year Level', detail['year_level']?.toString() ?? ''),
                _infoRow('School Year', detail['school_year'] ?? ''),
                _infoRow('Semester', '${detail['semester']} Sem'),
                const Divider(height: 24),
                Text('Subjects (${subjects.length})',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    controller: scrollCtrl,
                    itemCount: subjects.length,
                    itemBuilder: (_, i) {
                      final sub = subjects[i] as Map<String, dynamic>;
                      return Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(sub['subject_code'] ?? '',
                                      style: const TextStyle(
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13)),
                                  Text(sub['subject_name'] ?? '',
                                      style: TextStyle(
                                          fontSize: 12,
                                          color: Colors.grey.shade600)),
                                ],
                              ),
                            ),
                            Text('${sub['units']} units',
                                style: const TextStyle(
                                    fontSize: 13, fontWeight: FontWeight.w500)),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const Divider(),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Units',
                        style: TextStyle(fontWeight: FontWeight.w700)),
                    Text('$totalUnits',
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, fontSize: 16)),
                  ],
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.check_circle_outline_rounded),
                    label: const Text('Confirm Payment & Enroll'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6A1B9A),
                    ),
                    onPressed: () async {
                      try {
                        await ApiClient().dio.patch(
                            '/enrollment-batches/${detail['id']}/register');
                        if (ctx.mounted) {
                          Navigator.pop(ctx);
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(
                              content: Text('Student enrolled successfully!'),
                              backgroundColor: Color(0xFF10B981),
                            ),
                          );
                        }
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
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(
                    fontWeight: FontWeight.w500, fontSize: 13)),
          ),
        ],
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
            Text('No approved batches ready for payment',
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
          return Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: AppCard(
              onTap: () => _showDetailSheet(b),
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
                        Text('${b['school_year']} · ${b['semester']} Sem',
                            style: TextStyle(
                                fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppTheme.success.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'APPROVED',
                      style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.success),
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
