import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class DocumentRequestsScreen extends StatefulWidget {
  const DocumentRequestsScreen({super.key});

  @override
  State<DocumentRequestsScreen> createState() => _DocumentRequestsScreenState();
}

class _DocumentRequestsScreenState extends State<DocumentRequestsScreen> {
  final _purposeCtrl = TextEditingController();

  List<dynamic> _requests = [];
  List<String> _docTypes = [];
  bool _loading = true;
  bool _submitting = false;
  bool _showForm = false;
  String? _error;
  String? _selectedType;
  int _copies = 1;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _purposeCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final responses = await Future.wait([
        ApiClient().dio.get('/document-requests/mine'),
        ApiClient().dio.get('/document-requests/types'),
      ]);

      final reqs = List<dynamic>.from(responses[0].data as List? ?? const []);
      final types = List<dynamic>.from(responses[1].data as List? ?? const [])
          .map((e) => e.toString())
          .toList();

      if (!mounted) return;
      setState(() {
        _requests = reqs;
        _docTypes = types;
        if (_selectedType == null && types.isNotEmpty) {
          _selectedType = types.first;
        }
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load document requests.';
      });
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  Future<void> _submitRequest() async {
    final type = _selectedType?.trim();
    if (type == null || type.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a document type.')),
      );
      return;
    }

    setState(() => _submitting = true);
    try {
      await ApiClient().dio.post('/document-requests', data: {
        'document_type': type,
        'purpose': _purposeCtrl.text.trim().isEmpty ? null : _purposeCtrl.text.trim(),
        'copies': _copies,
      });

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Document request submitted.'),
          backgroundColor: AppTheme.success,
        ),
      );

      setState(() {
        _showForm = false;
        _purposeCtrl.clear();
        _copies = 1;
      });
      await _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Submission failed: $e'),
          backgroundColor: AppTheme.danger,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _submitting = false);
      }
    }
  }

  String _statusLabel(String? status) {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_process':
        return 'In Process';
      case 'ready_for_release':
        return 'Ready for Release';
      case 'completed':
        return 'Completed';
      case 'rejected':
        return 'Rejected';
      default:
        return status ?? 'Unknown';
    }
  }

  Color _statusColor(String? status) {
    switch (status) {
      case 'pending':
        return AppTheme.warning;
      case 'in_process':
        return const Color(0xFF2563EB);
      case 'ready_for_release':
        return AppTheme.success;
      case 'completed':
        return Colors.grey.shade600;
      case 'rejected':
        return AppTheme.danger;
      default:
        return Colors.grey.shade600;
    }
  }

  int _statusStep(String? status) {
    switch (status) {
      case 'pending':
        return 0;
      case 'in_process':
        return 1;
      case 'ready_for_release':
        return 2;
      case 'completed':
        return 3;
      default:
        return 0;
    }
  }

  String _formatDate(dynamic raw) {
    if (raw == null) return '-';
    final dt = DateTime.tryParse(raw.toString());
    if (dt == null) return raw.toString();
    return '${dt.day}/${dt.month}/${dt.year}';
  }

  Widget _buildStatusBadge(String? status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        _statusLabel(status).toUpperCase(),
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.3,
        ),
      ),
    );
  }

  Widget _buildTracker(String? status) {
    if (status == 'rejected') {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
        decoration: BoxDecoration(
          color: AppTheme.danger.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.danger.withValues(alpha: 0.18)),
        ),
        child: const Text(
          'Request rejected',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: AppTheme.danger,
          ),
        ),
      );
    }

    const steps = [
      'Pending',
      'In Process',
      'Ready for Release',
      'Completed',
    ];
    final step = _statusStep(status).clamp(0, steps.length - 1);
    final completed = status == 'completed';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: List.generate(steps.length, (i) {
            final done = i < step;
            final active = i == step;
            final color = completed
                ? AppTheme.success
                : active
                    ? AppTheme.maroon
                    : done
                        ? AppTheme.success
                        : Colors.grey.shade300;
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(right: i == steps.length - 1 ? 0 : 6),
                height: 6,
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
            );
          }),
        ),
        const SizedBox(height: 6),
        Text(
          'Progress: ${steps[step]}',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w700,
            color: completed ? AppTheme.success : AppTheme.maroon,
          ),
        ),
      ],
    );
  }

  Widget _buildRequestCard(Map<String, dynamic> item, {required bool faded}) {
    final status = item['status'] as String?;
    final remarks = (item['remarks'] ?? '').toString();
    final copies = (item['copies'] is int)
        ? item['copies'] as int
        : int.tryParse(item['copies']?.toString() ?? '') ?? 1;

    return Opacity(
      opacity: faded ? 0.72 : 1,
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item['document_type']?.toString() ?? '-',
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$copies cop${copies == 1 ? 'y' : 'ies'}'
                        '${(item['purpose'] ?? '').toString().trim().isEmpty ? '' : ' • ${item['purpose']}'}',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                _buildStatusBadge(status),
              ],
            ),
            const SizedBox(height: 12),
            _buildTracker(status),
            if (remarks.trim().isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: (status == 'rejected'
                          ? AppTheme.danger
                          : const Color(0xFF2563EB))
                      .withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Note: $remarks',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: status == 'rejected'
                        ? AppTheme.danger
                        : const Color(0xFF1D4ED8),
                  ),
                ),
              ),
            ],
            const SizedBox(height: 10),
            Text(
              'Requested ${_formatDate(item['requested_at'])}',
              style: TextStyle(
                fontSize: 11,
                color: Colors.grey.shade500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final active = _requests
        .where((e) {
          final status = (e as Map)['status']?.toString();
          return status != 'completed' && status != 'rejected';
        })
        .toList();
    final history = _requests
        .where((e) {
          final status = (e as Map)['status']?.toString();
          return status == 'completed' || status == 'rejected';
        })
        .toList();

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
                      'Document Requests',
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
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  MoistPageHeader(
                    eyebrow: 'Registrar',
                    title: 'Request school documents',
                    subtitle: 'Submit a request and track live status updates.',
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
                        '${active.length} active',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  if (_error != null)
                    AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Could not load requests',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.ink,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _error!,
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const SizedBox(height: 12),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton(
                              onPressed: _load,
                              child: const Text('Retry'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Text(
                                'New Request',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.ink,
                                ),
                              ),
                            ),
                            TextButton.icon(
                              onPressed: () {
                                setState(() => _showForm = !_showForm);
                              },
                              icon: Icon(_showForm
                                  ? Icons.keyboard_arrow_up_rounded
                                  : Icons.add_rounded),
                              label: Text(_showForm ? 'Hide' : 'New'),
                            ),
                          ],
                        ),
                        if (_showForm) ...[
                          const SizedBox(height: 10),
                          DropdownButtonFormField<String>(
                            initialValue: (_selectedType != null &&
                                    _docTypes.contains(_selectedType))
                                ? _selectedType
                                : null,
                            decoration:
                                const InputDecoration(labelText: 'Document Type'),
                            items: _docTypes
                                .map(
                                  (t) => DropdownMenuItem<String>(
                                    value: t,
                                    child: Text(t),
                                  ),
                                )
                                .toList(),
                            onChanged: (value) {
                              setState(() => _selectedType = value);
                            },
                          ),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _purposeCtrl,
                            minLines: 2,
                            maxLines: 3,
                            decoration: const InputDecoration(
                              labelText: 'Purpose (optional)',
                              hintText: 'e.g. Employment, scholarship, visa',
                            ),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              const Text(
                                'Copies',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.ink,
                                ),
                              ),
                              const SizedBox(width: 10),
                              IconButton(
                                onPressed: _copies > 1
                                    ? () => setState(() => _copies--)
                                    : null,
                                icon: const Icon(Icons.remove_circle_outline),
                              ),
                              Text(
                                '$_copies',
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.ink,
                                ),
                              ),
                              IconButton(
                                onPressed: _copies < 10
                                    ? () => setState(() => _copies++)
                                    : null,
                                icon: const Icon(Icons.add_circle_outline),
                              ),
                              const Spacer(),
                              OutlinedButton(
                                onPressed: _submitting
                                    ? null
                                    : () {
                                        setState(() => _showForm = false);
                                      },
                                child: const Text('Cancel'),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton.icon(
                              onPressed: _submitting ? null : _submitRequest,
                              icon: _submitting
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(Icons.send_rounded),
                              label: Text(
                                _submitting ? 'Submitting...' : 'Submit Request',
                              ),
                            ),
                          ),
                        ] else ...[
                          const SizedBox(height: 4),
                          Text(
                            'Create a request and we will notify you when it is ready for pickup.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  if (active.isNotEmpty) ...[
                    const Text(
                      'Active Requests',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...active.map((item) {
                      final map = Map<String, dynamic>.from(item as Map);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _buildRequestCard(map, faded: false),
                      );
                    }),
                  ],
                  if (history.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    const Text(
                      'History',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...history.map((item) {
                      final map = Map<String, dynamic>.from(item as Map);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: _buildRequestCard(map, faded: true),
                      );
                    }),
                  ],
                  if (active.isEmpty && history.isEmpty) ...[
                    AppCard(
                      child: Column(
                        children: [
                          Icon(
                            Icons.description_outlined,
                            size: 42,
                            color: Colors.grey.shade300,
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'No document requests yet',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w800,
                              color: AppTheme.ink,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Tap New Request to start your first request.',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
    );
  }
}
