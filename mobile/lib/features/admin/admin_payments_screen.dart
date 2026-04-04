import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminPaymentsScreen extends StatefulWidget {
  const AdminPaymentsScreen({super.key});

  @override
  State<AdminPaymentsScreen> createState() => _AdminPaymentsScreenState();
}

class _AdminPaymentsScreenState extends State<AdminPaymentsScreen> {
  List<dynamic> _payments = [];
  bool _loading = true;
  String _statusFilter = '';
  String? _checkoutUrl;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/payments', queryParameters: {
        'limit': 30,
        if (_statusFilter.isNotEmpty) 'status': _statusFilter,
      });
      if (!mounted) return;
      setState(() {
        _payments = res.data['data'] as List;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  String _formatCurrency(dynamic amount) {
    if (amount == null) return '-';
    final number = double.tryParse(amount.toString()) ?? 0;
    return 'PHP ${number.toStringAsFixed(2).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+\.)'), (m) => '${m[1]},')}';
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'paid':
        return AppTheme.success;
      case 'pending':
        return AppTheme.warning;
      case 'failed':
        return AppTheme.danger;
      case 'refunded':
        return AppTheme.accent;
      default:
        return Colors.grey;
    }
  }

  void _showCreateLinkDialog() {
    List<dynamic> students = [];
    String? selectedStudentId;
    final schoolYearCtrl = TextEditingController();
    final amountCtrl = TextEditingController();
    String semester = '1st';
    String paymentType = 'full';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          if (students.isEmpty) {
            ApiClient().dio.get('/students', queryParameters: {'limit': 100, 'status': 'active'}).then((response) {
              if (ctx.mounted) {
                setModalState(() => students = response.data['data'] as List);
              }
            });
          }

          return Padding(
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
                const Text(
                  'Create Payment Link',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Student'),
                  items: students
                      .map(
                        (student) => DropdownMenuItem<String>(
                          value: student['id'] as String,
                          child: Text(
                            '${student['student_number']} - ${student['last_name']}, ${student['first_name']}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(fontSize: 13),
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (value) => setModalState(() => selectedStudentId = value),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: schoolYearCtrl,
                        decoration: const InputDecoration(labelText: 'School Year'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: semester,
                        decoration: const InputDecoration(labelText: 'Semester'),
                        items: const [
                          DropdownMenuItem(value: '1st', child: Text('1st Sem')),
                          DropdownMenuItem(value: '2nd', child: Text('2nd Sem')),
                          DropdownMenuItem(value: 'summer', child: Text('Summer')),
                        ],
                        onChanged: (value) => setModalState(() => semester = value ?? '1st'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: amountCtrl,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        decoration: const InputDecoration(labelText: 'Amount', prefixText: 'PHP '),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: paymentType,
                        decoration: const InputDecoration(labelText: 'Type'),
                        items: const [
                          DropdownMenuItem(value: 'full', child: Text('Full')),
                          DropdownMenuItem(value: 'installment', child: Text('Installment')),
                          DropdownMenuItem(value: 'misc', child: Text('Misc')),
                        ],
                        onChanged: (value) => setModalState(() => paymentType = value ?? 'full'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () async {
                      if (selectedStudentId == null ||
                          amountCtrl.text.trim().isEmpty ||
                          schoolYearCtrl.text.trim().isEmpty) {
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          const SnackBar(content: Text('Please fill all required fields.')),
                        );
                        return;
                      }

                      try {
                        final res = await ApiClient().dio.post('/payments/create-link', data: {
                          'student_id': selectedStudentId,
                          'school_year': schoolYearCtrl.text.trim(),
                          'semester': semester,
                          'amount': double.parse(amountCtrl.text),
                          'payment_type': paymentType,
                        });
                        final url = res.data['checkoutUrl'] as String?;
                        if (ctx.mounted) Navigator.pop(ctx);
                        if (url != null) {
                          setState(() => _checkoutUrl = url);
                          _load();
                        }
                      } catch (e) {
                        if (!ctx.mounted) return;
                        ScaffoldMessenger.of(ctx).showSnackBar(
                          SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
                        );
                      }
                    },
                    child: const Text('Generate Payment Link'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final canCreateLinks = auth.isAdmin || auth.isRegistrar || auth.isCashier;

    return Column(
      children: [
        if (_checkoutUrl != null)
          Container(
            margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.success.withValues(alpha: 0.08),
              border: Border.all(color: AppTheme.success.withValues(alpha: 0.3)),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 16),
                    SizedBox(width: 6),
                    Text(
                      'Payment Link Created',
                      style: TextStyle(
                        fontWeight: FontWeight.w700,
                        color: AppTheme.success,
                        fontSize: 13,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  _checkoutUrl!,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                  overflow: TextOverflow.ellipsis,
                ),
                Row(
                  children: [
                    TextButton.icon(
                      onPressed: () {
                        Clipboard.setData(ClipboardData(text: _checkoutUrl!));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Link copied.')),
                        );
                      },
                      icon: const Icon(Icons.copy_rounded, size: 14),
                      label: const Text('Copy', style: TextStyle(fontSize: 12)),
                      style: TextButton.styleFrom(foregroundColor: AppTheme.success),
                    ),
                    TextButton(
                      onPressed: () => setState(() => _checkoutUrl = null),
                      child: Text(
                        'Dismiss',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: AppTheme.surface,
          child: Row(
            children: [
              Expanded(
                child: DropdownButtonFormField<String>(
                  decoration: const InputDecoration(
                    labelText: 'Filter by Status',
                    isDense: true,
                    contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                  ),
                  initialValue: _statusFilter.isEmpty ? '' : _statusFilter,
                  items: const [
                    DropdownMenuItem(value: '', child: Text('All Status')),
                    DropdownMenuItem(value: 'pending', child: Text('Pending')),
                    DropdownMenuItem(value: 'paid', child: Text('Paid')),
                    DropdownMenuItem(value: 'failed', child: Text('Failed')),
                    DropdownMenuItem(value: 'refunded', child: Text('Refunded')),
                  ],
                  onChanged: (value) {
                    _statusFilter = value ?? '';
                    _load();
                  },
                ),
              ),
              if (canCreateLinks) ...[
                const SizedBox(width: 8),
                ElevatedButton.icon(
                  onPressed: _showCreateLinkDialog,
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('New'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _payments.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.payments_outlined, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No payments found', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: _payments.length,
                        itemBuilder: (context, index) {
                          final payment = _payments[index] as Map<String, dynamic>;
                          final color = _statusColor(payment['status'] as String?);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _formatCurrency(payment['amount']),
                                          style: const TextStyle(
                                            fontSize: 18,
                                            fontWeight: FontWeight.w800,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                        const SizedBox(height: 3),
                                        Text(
                                          '${payment['last_name']}, ${payment['first_name']} (${payment['student_number']})',
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: Colors.grey.shade700,
                                            fontWeight: FontWeight.w500,
                                          ),
                                        ),
                                        Text(
                                          '${payment['school_year']} | ${payment['semester']} Sem | ${payment['payment_type']}',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusBadge(label: '${payment['status']}'.toUpperCase(), color: color),
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
