import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminEnrollmentsScreen extends StatefulWidget {
  const AdminEnrollmentsScreen({super.key});

  @override
  State<AdminEnrollmentsScreen> createState() => _AdminEnrollmentsScreenState();
}

class _AdminEnrollmentsScreenState extends State<AdminEnrollmentsScreen> {
  List<dynamic> _enrollments = [];
  List<dynamic> _approvalBatches = [];
  bool _loading = true;
  String _schoolYear = '';
  String _semester = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      if (auth.isStaff) {
        final res = await ApiClient().dio.get('/enrollment-batches', queryParameters: {
          'status': 'evaluated',
          'limit': 50,
        });
        if (!mounted) return;
        setState(() {
          _approvalBatches = res.data['data'] as List;
          _enrollments = [];
          _loading = false;
        });
        return;
      }

      final res = await ApiClient().dio.get('/enrollments', queryParameters: {
        'limit': 30,
        if (_schoolYear.isNotEmpty) 'school_year': _schoolYear,
        if (_semester.isNotEmpty) 'semester': _semester,
      });
      if (!mounted) return;
      setState(() {
        _enrollments = res.data['data'] as List;
        _approvalBatches = [];
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  Future<void> _approveBatch(String id) async {
    try {
      await ApiClient().dio.patch('/enrollment-batches/$id/approve');
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Future<void> _dropEnrollment(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Drop Enrollment'),
        content: const Text('Mark this enrollment as dropped?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Drop', style: TextStyle(color: AppTheme.danger)),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await ApiClient().dio.patch('/enrollments/$id', data: {'status': 'dropped'});
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'enrolled':
        return AppTheme.success;
      case 'dropped':
        return AppTheme.danger;
      case 'completed':
        return AppTheme.accent;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    if (auth.isStaff) {
      if (_loading) {
        return const Center(child: CircularProgressIndicator());
      }
      if (_approvalBatches.isEmpty) {
        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.fact_check_outlined, size: 56, color: Colors.grey.shade300),
              const SizedBox(height: 12),
              Text('No evaluated batches waiting for approval', style: TextStyle(color: Colors.grey.shade500)),
            ],
          ),
        );
      }
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView.builder(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
          itemCount: _approvalBatches.length,
          itemBuilder: (context, index) {
            final batch = _approvalBatches[index] as Map<String, dynamic>;
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: AppCard(
                padding: const EdgeInsets.all(14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${batch['last_name']}, ${batch['first_name']}',
                      style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: Color(0xFF1E293B)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${batch['student_number']} | ${batch['course'] ?? 'No course'} | Year ${batch['year_level'] ?? '-'}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                    ),
                    Text(
                      '${batch['school_year']} | ${batch['semester']} Sem',
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        const StatusBadge(label: 'EVALUATED', color: Colors.blue),
                        const Spacer(),
                        ElevatedButton(
                          onPressed: () => _approveBatch(batch['id'] as String),
                          child: const Text('Approve'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      );
    }

    final canManageEnrollments = auth.isAdmin || auth.isRegistrar;

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
                        hintText: 'School Year',
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
              if (!canManageEnrollments) ...[
                const SizedBox(height: 10),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Text(
                    'View only access. Enrollment changes stay with admin and registrar.',
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
              : _enrollments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.list_alt_outlined, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No enrollments found', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: _enrollments.length,
                        itemBuilder: (context, index) {
                          final enrollment = _enrollments[index] as Map<String, dynamic>;
                          final color = _statusColor(enrollment['status'] as String?);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${enrollment['last_name']}, ${enrollment['first_name']}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                            fontSize: 13,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${enrollment['subject_code']} - ${enrollment['subject_name']}',
                                          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                                        ),
                                        Text(
                                          '${enrollment['school_year']} | ${enrollment['semester']} Sem | ${enrollment['units']} units',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      StatusBadge(label: '${enrollment['status']}'.toUpperCase(), color: color),
                                      if (canManageEnrollments && enrollment['status'] == 'enrolled') ...[
                                        const SizedBox(height: 6),
                                        GestureDetector(
                                          onTap: () => _dropEnrollment(enrollment['id'] as String),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              color: AppTheme.danger.withValues(alpha: 0.08),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: const Text(
                                              'Drop',
                                              style: TextStyle(
                                                fontSize: 11,
                                                color: AppTheme.danger,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
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
      ],
    );
  }
}
