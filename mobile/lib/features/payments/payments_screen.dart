import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

// ─── Constants ──────────────────────────────────────────────
const _convRate = 0.03; // 3% convenience fee — must match backend

const _methodLabel = {
  'cash': 'Cash',
  'gcash': 'GCash',
  'maya': 'Maya',
  'bank_transfer': 'Bank Transfer',
  'xendit': 'Xendit',
  'credit_card': 'Credit Card',
  'qris': 'QRIS',
  'ovo': 'OVO',
  'dana': 'DANA',
};

const _periodLabel = {
  'enrollment_fee': 'Enrollment Fee',
  'prelim': 'Prelim',
  'midterm': 'Midterm',
  'semi_finals': 'Semi-Finals',
  'finals': 'Finals',
};

// ─── Root Screen ────────────────────────────────────────────
class PaymentsScreen extends StatefulWidget {
  const PaymentsScreen({super.key});

  @override
  State<PaymentsScreen> createState() => _PaymentsScreenState();
}

class _PaymentsScreenState extends State<PaymentsScreen> {
  List<dynamic> _batches = [];
  Map<String, dynamic>? _activeTerm;
  bool _loading = true;
  bool _hasError = false;
  String _selectedTerm = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _hasError = false; });
    try {
      final batchesRes = await ApiClient().dio.get(
        '/enrollment-batches',
        queryParameters: {'limit': 50},
      );
      final all = (batchesRes.data['data'] as List? ?? [])
          .where((b) => ['for_payment', 'for_registration', 'enrolled']
              .contains(b['status']))
          .toList();

      Map<String, dynamic>? activeTerm;
      try {
        final termRes = await ApiClient().dio.get('/academic-settings/active');
        if (termRes.data is Map) {
          activeTerm = Map<String, dynamic>.from(termRes.data as Map);
        }
      } catch (_) {
        // active term is optional; proceed without it
      }

      if (!mounted) return;
      setState(() {
        _batches = all;
        _activeTerm = activeTerm;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() { _loading = false; _hasError = true; });
    }
  }

  String _termKey(Map<String, dynamic> b) =>
      '${b['school_year']}__${b['semester']}';

  List<Map<String, String>> get _termOptions {
    final seen = <String>{};
    final opts = <Map<String, String>>[];
    for (final b in _batches) {
      final key = _termKey(b as Map<String, dynamic>);
      if (seen.add(key)) {
        opts.add({
          'key': key,
          'label': '${b['school_year']} — ${b['semester']} Semester',
        });
      }
    }
    return opts;
  }

  List<dynamic> get _visibleBatches {
    if (_selectedTerm.isEmpty) return _batches;
    return _batches
        .where((b) => _termKey(b as Map<String, dynamic>) == _selectedTerm)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.canPop() ? context.pop() : context.go('/'),
        ),
        automaticallyImplyLeading: false,
        backgroundColor: AppTheme.maroonDark,
        foregroundColor: Colors.white,
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
                      'Statement of Account',
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
      body: _hasError
          ? _buildError()
          : RefreshIndicator(
              onRefresh: _load,
              color: AppTheme.maroon,
              child: ListView(
                padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
                children: [
                  // ── Page intro
                  _buildIntroCard(),
                  const SizedBox(height: 16),

                  // ── Term filter
                  if (!_loading && _termOptions.isNotEmpty) ...[
                    _TermFilterCard(
                      options: _termOptions,
                      value: _selectedTerm,
                      onChanged: (v) => setState(() => _selectedTerm = v ?? ''),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ── Loading
                  if (_loading) ...[
                    _ShimmerCard(),
                    const SizedBox(height: 16),
                    _ShimmerCard(),
                  ] else if (_visibleBatches.isEmpty)
                    _buildEmpty()
                  else
                    for (final b in _visibleBatches) ...[
                      _SoaCard(
                        batchBasic: b as Map<String, dynamic>,
                        activeTerm: _activeTerm,
                      ),
                      const SizedBox(height: 16),
                    ],
                ],
              ),
            ),
    );
  }

  Widget _buildIntroCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.maroonDark, AppTheme.maroon, AppTheme.maroonSoft],
        ),
        borderRadius: BorderRadius.circular(22),
        boxShadow: [
          BoxShadow(
            color: AppTheme.maroon.withValues(alpha: 0.22),
            blurRadius: 20,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        children: [
          const MoistSealBadge(size: 52),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'MY PAYMENTS',
                  style: TextStyle(
                    color: AppTheme.goldStrong.withValues(alpha: 0.92),
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 4),
                const Text(
                  'Statement of Account',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'View your tuition assessment and pay online via GCash, Maya, or card.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontSize: 11,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.wifi_off_rounded, size: 56, color: Colors.grey.shade300),
            const SizedBox(height: 14),
            Text(
              'Could not load account records',
              style: TextStyle(
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w600,
                  fontSize: 15),
            ),
            const SizedBox(height: 8),
            Text(
              'Please check your connection and try again.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmpty() {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 28),
        child: Column(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: AppTheme.maroon.withValues(alpha: 0.07),
                borderRadius: BorderRadius.circular(18),
              ),
              child: const Icon(Icons.receipt_long_outlined,
                  color: AppTheme.maroon, size: 28),
            ),
            const SizedBox(height: 14),
            Text(
              'No account records found',
              style: TextStyle(
                  color: Colors.grey.shade700,
                  fontWeight: FontWeight.w700,
                  fontSize: 14),
            ),
            const SizedBox(height: 6),
            Text(
              _selectedTerm.isNotEmpty
                  ? 'No records found for the selected term.'
                  : 'Your SOA will appear here once your enrollment is approved and assessed.',
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Colors.grey.shade500, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Term Filter Card ────────────────────────────────────────
class _TermFilterCard extends StatelessWidget {
  final List<Map<String, String>> options;
  final String value;
  final ValueChanged<String?> onChanged;

  const _TermFilterCard(
      {required this.options, required this.value, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Filter by Term',
            style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: AppTheme.ink),
          ),
          const SizedBox(height: 4),
          const Text(
            'Choose a term to view its records.',
            style: TextStyle(fontSize: 11, color: Colors.grey),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
            decoration: BoxDecoration(
              border:
                  Border.all(color: AppTheme.maroon.withValues(alpha: 0.15)),
              borderRadius: BorderRadius.circular(14),
              color: AppTheme.paper,
            ),
            child: DropdownButton<String>(
              value: value.isEmpty ? '' : value,
              isExpanded: true,
              underline: const SizedBox.shrink(),
              style: const TextStyle(
                  fontSize: 13,
                  color: AppTheme.ink,
                  fontWeight: FontWeight.w500),
              items: [
                const DropdownMenuItem(
                    value: '', child: Text('All Terms')),
                ...options.map((o) => DropdownMenuItem(
                    value: o['key']!, child: Text(o['label']!))),
              ],
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shimmer Placeholder ─────────────────────────────────────
class _ShimmerCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
              height: 16,
              width: 180,
              decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(8))),
          const SizedBox(height: 10),
          Container(
              height: 80,
              decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14))),
          const SizedBox(height: 10),
          Container(
              height: 44,
              decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14))),
        ],
      ),
    );
  }
}

// ─── SOA Card ────────────────────────────────────────────────
class _SoaCard extends StatefulWidget {
  final Map<String, dynamic> batchBasic;
  final Map<String, dynamic>? activeTerm;

  const _SoaCard({required this.batchBasic, this.activeTerm});

  @override
  State<_SoaCard> createState() => _SoaCardState();
}

class _SoaCardState extends State<_SoaCard> {
  Map<String, dynamic>? _batch;
  List<dynamic> _payments = [];
  bool _loading = true;
  bool _showPayForm = false;
  DateTime _now = DateTime.now();
  Timer? _timer;
  bool _cancelling = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        ApiClient().dio.get('/enrollment-batches/${widget.batchBasic['id']}'),
        ApiClient().dio.get('/payments/batch/${widget.batchBasic['id']}'),
      ]);
      if (!mounted) return;
      setState(() {
        _batch = Map<String, dynamic>.from(results[0].data as Map);
        _payments = results[1].data as List? ?? [];
        _loading = false;
      });
      _startTimerIfNeeded();
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _startTimerIfNeeded() {
    _timer?.cancel();
    if (_activeAwaitingPayment != null) {
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() => _now = DateTime.now());
        if (_xenditCountdown == 'Expired') {
          _timer?.cancel();
          _load();
        }
      });
    }
  }

  // ── Computed properties
  double get _assessed =>
      double.tryParse('${widget.batchBasic['assessed_amount'] ?? _batch?['assessed_amount'] ?? 0}') ?? 0;

  List<dynamic> get _verifiedPayments =>
      _payments.where((p) => p['status'] == 'verified').toList();

  double get _totalPaid =>
      _verifiedPayments.fold(0.0, (s, p) => s + (double.tryParse('${p['amount']}') ?? 0));

  double get _balance => (_assessed - _totalPaid).clamp(0.0, double.infinity);

  bool get _isFullyPaid => _assessed > 0 && _balance <= 0;

  bool get _hasPending => _payments.any((p) =>
      p['status'] == 'pending' &&
      p['xendit_invoice_id'] == null &&
      p['payment_method'] != 'xendit');

  Map<String, dynamic>? get _activeAwaitingPayment {
    for (final p in _payments) {
      if (p['status'] != 'awaiting_payment') continue;
      if (p['xendit_invoice_id'] == null || p['xendit_invoice_url'] == null) continue;
      final expires = p['xendit_expires_at'] as String?;
      if (expires == null) return p as Map<String, dynamic>;
      if (DateTime.tryParse(expires)?.isAfter(_now) == true) {
        return p as Map<String, dynamic>;
      }
    }
    return null;
  }

  String? get _xenditCountdown {
    final exp = _activeAwaitingPayment?['xendit_expires_at'] as String?;
    if (exp == null) return null;
    final diff = DateTime.tryParse(exp)?.difference(_now);
    if (diff == null || diff.isNegative) return 'Expired';
    final m = diff.inMinutes;
    final s = diff.inSeconds % 60;
    if (m >= 60) {
      final h = m ~/ 60;
      final rm = m % 60;
      return '${h}h ${rm.toString().padLeft(2, '0')}m';
    }
    return '$m:${s.toString().padLeft(2, '0')}';
  }

  bool get _isActiveTerm {
    final at = widget.activeTerm;
    // If active term couldn't be loaded, allow payment (backend will validate)
    if (at == null) return true;
    return widget.batchBasic['school_year'] == at['school_year'] &&
        widget.batchBasic['semester'] == at['semester'];
  }

  bool get _canPayOnline {
    final status = widget.batchBasic['status'] as String?;
    return _isActiveTerm &&
        !_isFullyPaid &&
        !_hasPending &&
        ['for_payment', 'for_registration', 'enrolled'].contains(status);
  }

  // ── Helpers
  String _fmtCurrency(dynamic n) {
    final v = double.tryParse('${n ?? 0}') ?? 0;
    final parts = v.toStringAsFixed(2).split('.');
    final intPart = parts[0].replaceAllMapped(
        RegExp(r'(\d)(?=(\d{3})+$)'), (m) => '${m[1]},');
    return '₱$intPart.${parts[1]}';
  }

  String _fmtDate(String? d) {
    if (d == null) return '—';
    try {
      final dt = DateTime.parse(d).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year}';
    } catch (_) {
      return d;
    }
  }

  String _fmtDateTime(String? d) {
    if (d == null) return '—';
    try {
      final dt = DateTime.parse(d).toLocal();
      const months = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      final h = dt.hour % 12 == 0 ? 12 : dt.hour % 12;
      final m = dt.minute.toString().padLeft(2, '0');
      final ampm = dt.hour < 12 ? 'AM' : 'PM';
      return '${months[dt.month - 1]} ${dt.day}, ${dt.year} $h:$m $ampm';
    } catch (_) {
      return d;
    }
  }

  Future<void> _openUrl(String url) async {
    try {
      final uri = Uri.parse(url);
      final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
      if (!launched && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open payment page. Please try again.'),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open payment page. Please try again.'),
          ),
        );
      }
    }
  }

  Future<void> _cancelAndRestart() async {
    final ap = _activeAwaitingPayment;
    if (ap == null) {
      setState(() => _showPayForm = true);
      return;
    }
    setState(() => _cancelling = true);
    try {
      await ApiClient().dio.patch('/payments/${ap['id']}/xendit-cancel');
      await _load();
      if (mounted) setState(() { _showPayForm = true; _cancelling = false; });
    } catch (_) {
      if (mounted) setState(() => _cancelling = false);
    }
  }

  Color _batchStatusColor(String? s) {
    switch (s) {
      case 'for_payment': return AppTheme.warning;
      case 'for_registration': return const Color(0xFF2563EB);
      case 'enrolled': return AppTheme.success;
      default: return Colors.grey;
    }
  }

  String _batchStatusLabel(String? s) {
    switch (s) {
      case 'for_payment': return 'For Payment';
      case 'for_registration': return 'For Registration';
      case 'enrolled': return 'Enrolled';
      default: return s ?? '—';
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = widget.batchBasic['status'] as String?;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── SOA Header
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${widget.batchBasic['school_year']} — ${widget.batchBasic['semester']} Semester',
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.ink),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      '${widget.batchBasic['course'] ?? ''} · Year ${widget.batchBasic['year_level'] ?? ''}',
                      style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  StatusBadge(
                    label: _batchStatusLabel(status).toUpperCase(),
                    color: _batchStatusColor(status),
                  ),
                  if (_isFullyPaid) ...[
                    const SizedBox(height: 6),
                    const StatusBadge(label: 'FULLY PAID', color: AppTheme.success),
                  ],
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),

          // ── Loading skeleton
          if (_loading) ...[
            Container(
              height: 82,
              decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14)),
            ),
            const SizedBox(height: 10),
            Container(
              height: 46,
              decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14)),
            ),
          ] else ...[
            // ── Assessment Summary
            _AssessmentCard(
              assessed: _assessed,
              totalPaid: _totalPaid,
              balance: _balance,
              isFullyPaid: _isFullyPaid,
              fmtCurrency: _fmtCurrency,
            ),
            const SizedBox(height: 14),

            // ── Closed term notice
            if (!_isActiveTerm && _balance > 0) ...[
              _InfoBanner(
                bgColor: Colors.grey.shade50,
                borderColor: Colors.grey.shade300,
                textColor: Colors.grey.shade700,
                icon: Icons.info_outline_rounded,
                text:
                    'This term is already closed. Online payment is disabled, and the remaining balance will carry over to your next active term.',
              ),
              const SizedBox(height: 14),
            ],

            // ── Pay Online button
            if (_canPayOnline && !_showPayForm && _activeAwaitingPayment == null) ...[
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => setState(() => _showPayForm = true),
                  icon: const Icon(Icons.credit_card_rounded, size: 18),
                  label: const Text('Pay Online'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.maroon,
                    side: BorderSide(
                        color: AppTheme.maroon.withValues(alpha: 0.4), width: 1.5),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // ── Pending manual verification
            if (_hasPending && !_isFullyPaid) ...[
              const _InfoBanner(
                bgColor: Color(0xFFFFFBEB),
                borderColor: Color(0xFFFCD34D),
                textColor: Color(0xFF92400E),
                icon: Icons.hourglass_top_rounded,
                text:
                    'You have a pending payment awaiting cashier verification.',
              ),
              const SizedBox(height: 14),
            ],

            // ── Active Xendit checkout
            if (_activeAwaitingPayment != null && !_isFullyPaid) ...[
              _XenditAwaitingBanner(
                payment: _activeAwaitingPayment!,
                countdown: _xenditCountdown,
                fmtDateTime: _fmtDateTime,
                isClosedTerm: !_isActiveTerm,
                cancelling: _cancelling,
                onContinue: () => _openUrl(
                    _activeAwaitingPayment!['xendit_invoice_url'] as String),
                onRestart: _cancelAndRestart,
              ),
              const SizedBox(height: 14),
            ],

            // ── Online pay form
            if (_showPayForm) ...[
              _OnlinePayForm(
                batch: _batch ?? widget.batchBasic,
                balance: _balance,
                fmtCurrency: _fmtCurrency,
                onCancel: () => setState(() => _showPayForm = false),
                onPaid: (url) async {
                  setState(() => _showPayForm = false);
                  await _openUrl(url);
                  await _load();
                },
              ),
              const SizedBox(height: 14),
            ],

            // ── Payment records
            _PaymentRecords(
              payments: _payments,
              fmtCurrency: _fmtCurrency,
              fmtDate: _fmtDate,
              fmtDateTime: _fmtDateTime,
            ),
            const SizedBox(height: 14),

            // ── In-person info
            const _InfoBanner(
              bgColor: Color(0xFFEFF6FF),
              borderColor: Color(0xFFBFDBFE),
              textColor: Color(0xFF1E40AF),
              icon: Icons.account_balance_rounded,
              text:
                  "Paying in person? You may also pay directly at the Cashier's Office. Bring your reference number or OR.",
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Assessment Card ─────────────────────────────────────────
class _AssessmentCard extends StatelessWidget {
  final double assessed;
  final double totalPaid;
  final double balance;
  final bool isFullyPaid;
  final String Function(dynamic) fmtCurrency;

  const _AssessmentCard({
    required this.assessed,
    required this.totalPaid,
    required this.balance,
    required this.isFullyPaid,
    required this.fmtCurrency,
  });

  @override
  Widget build(BuildContext context) {
    final borderColor = isFullyPaid
        ? const Color(0xFF6EE7B7)
        : assessed > 0
            ? const Color(0xFFFDBA74)
            : Colors.grey.shade200;
    final headerBg = isFullyPaid
        ? const Color(0xFFECFDF5)
        : assessed > 0
            ? const Color(0xFFFFF7ED)
            : Colors.grey.shade50;
    final headerText = isFullyPaid
        ? const Color(0xFF065F46)
        : assessed > 0
            ? const Color(0xFF7C2D12)
            : Colors.grey;

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: headerBg,
              border: Border(bottom: BorderSide(color: borderColor)),
              borderRadius:
                  const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Text(
                  'Assessment',
                  style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: headerText),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(14),
            child: assessed > 0
                ? Column(
                    children: [
                      _AmountRow(
                          label: 'Total Tuition Fee',
                          value: fmtCurrency(assessed),
                          valueColor: const Color(0xFF374151)),
                      const SizedBox(height: 8),
                      _AmountRow(
                          label: 'Total Paid',
                          value: fmtCurrency(totalPaid),
                          valueColor: AppTheme.success),
                      const Divider(height: 20),
                      _AmountRow(
                        label: 'Remaining Balance',
                        value: balance > 0 ? fmtCurrency(balance) : '₱0.00',
                        valueColor: balance > 0
                            ? const Color(0xFFC2410C)
                            : AppTheme.success,
                        bold: true,
                        fontSize: 15,
                      ),
                    ],
                  )
                : Text(
                    "Assessment not yet set. Visit the Cashier's Office for details.",
                    style: TextStyle(
                        color: Colors.grey.shade500,
                        fontSize: 13,
                        fontStyle: FontStyle.italic),
                  ),
          ),
        ],
      ),
    );
  }
}

class _AmountRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final bool bold;
  final double fontSize;

  const _AmountRow({
    required this.label,
    required this.value,
    this.valueColor,
    this.bold = false,
    this.fontSize = 13,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
              color: const Color(0xFF374151),
            ),
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: fontSize,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w600,
            color: valueColor,
          ),
        ),
      ],
    );
  }
}

// ─── Info Banner ─────────────────────────────────────────────
class _InfoBanner extends StatelessWidget {
  final Color bgColor;
  final Color borderColor;
  final Color textColor;
  final IconData icon;
  final String text;

  const _InfoBanner({
    required this.bgColor,
    required this.borderColor,
    required this.textColor,
    required this.icon,
    required this.text,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border.all(color: borderColor),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: textColor),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(fontSize: 12, color: textColor, height: 1.4),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Xendit Awaiting Banner ──────────────────────────────────
class _XenditAwaitingBanner extends StatelessWidget {
  final Map<String, dynamic> payment;
  final String? countdown;
  final String Function(String?) fmtDateTime;
  final bool isClosedTerm;
  final bool cancelling;
  final VoidCallback onContinue;
  final VoidCallback onRestart;

  const _XenditAwaitingBanner({
    required this.payment,
    required this.countdown,
    required this.fmtDateTime,
    required this.isClosedTerm,
    required this.cancelling,
    required this.onContinue,
    required this.onRestart,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        border: Border.all(color: const Color(0xFFBFDBFE)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Color(0xFF2563EB)),
              ),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'You have an incomplete Xendit checkout that has not been confirmed yet.',
                  style: TextStyle(
                      fontSize: 12, color: Color(0xFF1E3A8A), height: 1.4),
                ),
              ),
            ],
          ),
          if (payment['xendit_expires_at'] != null) ...[
            const SizedBox(height: 8),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.7),
                border: Border.all(color: const Color(0xFFBFDBFE)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Expires: ${fmtDateTime(payment['xendit_expires_at'] as String?)}',
                    style: const TextStyle(
                        fontSize: 12, color: Color(0xFF1E40AF)),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Time left: ${countdown ?? 'Calculating…'}',
                    style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E40AF)),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 6),
          const Text(
            'If you already paid, it will appear automatically once Xendit confirms it.',
            style: TextStyle(fontSize: 11, color: Color(0xFF2563EB)),
          ),
          if (!isClosedTerm) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: cancelling ? null : onContinue,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      elevation: 0,
                    ),
                    child: const Text('Continue Payment',
                        style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w700)),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton(
                    onPressed: cancelling ? null : onRestart,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF2563EB),
                      side: const BorderSide(color: Color(0xFFBFDBFE)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      cancelling ? 'Resetting…' : 'Start New',
                      style: const TextStyle(
                          fontSize: 12, fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

// ─── Online Pay Form ─────────────────────────────────────────
class _OnlinePayForm extends StatefulWidget {
  final Map<String, dynamic> batch;
  final double balance;
  final String Function(dynamic) fmtCurrency;
  final VoidCallback onCancel;
  final Future<void> Function(String url) onPaid;

  const _OnlinePayForm({
    required this.batch,
    required this.balance,
    required this.fmtCurrency,
    required this.onCancel,
    required this.onPaid,
  });

  @override
  State<_OnlinePayForm> createState() => _OnlinePayFormState();
}

class _OnlinePayFormState extends State<_OnlinePayForm> {
  final _amountCtrl = TextEditingController();
  bool _saving = false;

  double get _base => double.tryParse(_amountCtrl.text) ?? 0;
  double get _convFee =>
      _base > 0 ? ((_base * _convRate * 100).ceilToDouble() / 100) : 0;
  double get _total => _base + _convFee;

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _pay() async {
    if (_base < 1) return;
    setState(() => _saving = true);
    try {
      final res = await ApiClient().dio.post('/payments/xendit-create', data: {
        'batch_id': widget.batch['id'],
        'amount': _base,
      });
      final url = res.data['invoiceUrl'] as String?;
      if (url == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Failed to create payment link. Please try again.'),
            ),
          );
          setState(() => _saving = false);
        }
        return;
      }
      if (mounted) {
        try {
          await widget.onPaid(url);
        } catch (_) {
          if (mounted) setState(() => _saving = false);
        }
      }
    } catch (e) {
      if (mounted) {
        final msg = e.toString().contains('DioException')
            ? 'Payment request failed. Check your connection and try again.'
            : 'Payment failed. Please try again.';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(msg)),
        );
        setState(() => _saving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final assessed =
        double.tryParse('${widget.batch['assessed_amount'] ?? 0}') ?? 0;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFFFBEB).withValues(alpha: 0.6),
        border: Border.all(color: AppTheme.maroon.withValues(alpha: 0.2)),
        borderRadius: BorderRadius.circular(18),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Pay Online via Xendit',
            style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w800,
                color: AppTheme.ink),
          ),
          const SizedBox(height: 14),
          TextField(
            controller: _amountCtrl,
            keyboardType:
                const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: 'Amount to Pay (₱)',
              hintText: widget.balance > 0
                  ? widget.balance.toStringAsFixed(2)
                  : assessed > 0
                      ? assessed.toStringAsFixed(2)
                      : '0.00',
              prefixText: '₱ ',
              helperText: widget.balance > 0
                  ? 'Balance due: ${widget.fmtCurrency(widget.balance)}'
                  : null,
            ),
            onChanged: (_) => setState(() {}),
          ),

          // ── Fee breakdown
          if (_base > 0) ...[
            const SizedBox(height: 12),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade200),
                borderRadius: BorderRadius.circular(14),
                color: Colors.white,
              ),
              child: Column(
                children: [
                  _BreakdownRow(
                      label: 'Tuition Payment',
                      value: widget.fmtCurrency(_base)),
                  const Divider(height: 1),
                  _BreakdownRow(
                    label: 'Convenience Fee (3%)',
                    value: widget.fmtCurrency(_convFee),
                    textColor: Colors.grey.shade600,
                    small: true,
                  ),
                  const Divider(height: 1),
                  _BreakdownRow(
                    label: 'Total to Pay',
                    value: widget.fmtCurrency(_total),
                    bold: true,
                    textColor: AppTheme.maroon,
                  ),
                ],
              ),
            ),
          ],

          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              border: Border.all(color: Colors.grey.shade100),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Text(
              "You will be redirected to Xendit's secure checkout. Accepted: GCash, Maya, credit/debit cards, and more. Payment only appears in records after Xendit confirms it.",
              style: TextStyle(
                  fontSize: 11, color: Colors.grey.shade500, height: 1.4),
            ),
          ),
          const SizedBox(height: 14),

          // ── Action buttons — flex row
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : widget.onCancel,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Cancel',
                      style: TextStyle(fontSize: 13)),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                flex: 2,
                child: ElevatedButton.icon(
                  onPressed: (_saving || _base < 1) ? null : _pay,
                  icon: _saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.credit_card_rounded, size: 16),
                  label: Text(
                    _saving
                        ? 'Redirecting…'
                        : _base > 0
                            ? 'Pay ${widget.fmtCurrency(_total)}'
                            : 'Pay Now',
                    style: const TextStyle(
                        fontSize: 13, fontWeight: FontWeight.w700),
                  ),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _BreakdownRow extends StatelessWidget {
  final String label;
  final String value;
  final bool bold;
  final bool small;
  final Color? textColor;

  const _BreakdownRow({
    required this.label,
    required this.value,
    this.bold = false,
    this.small = false,
    this.textColor,
  });

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: small ? 12 : 13,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
      color: textColor ?? const Color(0xFF374151),
    );
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(child: Text(label, style: style)),
          Text(value, style: style),
        ],
      ),
    );
  }
}

// ─── Payment Records ─────────────────────────────────────────
class _PaymentRecords extends StatelessWidget {
  final List<dynamic> payments;
  final String Function(dynamic) fmtCurrency;
  final String Function(String?) fmtDate;
  final String Function(String?) fmtDateTime;

  const _PaymentRecords({
    required this.payments,
    required this.fmtCurrency,
    required this.fmtDate,
    required this.fmtDateTime,
  });

  Color _statusBg(String? s) {
    switch (s) {
      case 'verified': return const Color(0xFFECFDF5);
      case 'rejected':
      case 'failed': return const Color(0xFFFEF2F2);
      case 'cancelled': return Colors.grey.shade50;
      default: return const Color(0xFFFFFBEB);
    }
  }

  Color _statusBorder(String? s) {
    switch (s) {
      case 'verified': return const Color(0xFF6EE7B7);
      case 'rejected':
      case 'failed': return const Color(0xFFFCA5A5);
      case 'cancelled': return Colors.grey.shade200;
      default: return const Color(0xFFFCD34D);
    }
  }

  Color _periodColor(String? p) {
    switch (p) {
      case 'enrollment_fee': return AppTheme.gold;
      case 'prelim': return const Color(0xFF2563EB);
      case 'midterm': return const Color(0xFF7C3AED);
      case 'semi_finals': return const Color(0xFFEA580C);
      case 'finals': return AppTheme.success;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Payment Records',
          style: TextStyle(
              fontSize: 13, fontWeight: FontWeight.w700, color: AppTheme.ink),
        ),
        const SizedBox(height: 8),
        if (payments.isEmpty)
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 20),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey.shade200, width: 1.5),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Center(
              child: Text('No payment records yet',
                  style: TextStyle(fontSize: 13, color: Colors.grey)),
            ),
          )
        else
          for (final p in payments) ...[
            _buildRecord(p as Map<String, dynamic>),
            const SizedBox(height: 8),
          ],
      ],
    );
  }

  Widget _buildRecord(Map<String, dynamic> p) {
    final status = p['status'] as String?;
    final isXendit =
        p['xendit_invoice_id'] != null || p['payment_method'] == 'xendit';
    final refNum =
        (p['reference_number'] ?? p['xendit_invoice_id']) as String?;
    final period = p['payment_period'] as String?;
    final pColor = _periodColor(period);

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _statusBg(status),
        border: Border.all(color: _statusBorder(status)),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  runSpacing: 4,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    // Period badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: pColor.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        _periodLabel[period] ?? (period ?? '—'),
                        style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: pColor),
                      ),
                    ),
                    Text(
                      fmtCurrency(p['amount']),
                      style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.ink),
                    ),
                    Text(
                      _methodLabel[p['payment_method']] ??
                          (p['payment_method'] as String? ?? 'Cash'),
                      style: TextStyle(
                          fontSize: 12, color: Colors.grey.shade600),
                    ),
                    if (isXendit)
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          border: Border.all(
                              color: const Color(0xFFBFDBFE)),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Online',
                            style: TextStyle(
                                fontSize: 10, color: Color(0xFF2563EB))),
                      ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  fmtDate(p['created_at'] as String?),
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
                if (refNum != null) ...[
                  const SizedBox(height: 2),
                  Text.rich(
                    TextSpan(
                      text: 'Ref: ',
                      style: TextStyle(
                          fontSize: 11, color: Colors.grey.shade500),
                      children: [
                        TextSpan(
                          text: refNum,
                          style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 4),
                _statusNote(status, isXendit, p),
              ],
            ),
          ),
          if (status == 'verified')
            const Icon(Icons.check_circle_rounded,
                color: Color(0xFF059669), size: 20),
        ],
      ),
    );
  }

  Widget _statusNote(
      String? status, bool isXendit, Map<String, dynamic> p) {
    switch (status) {
      case 'verified':
        return const Text('✓ Payment confirmed',
            style: TextStyle(fontSize: 11, color: Color(0xFF059669)));
      case 'pending' when !isXendit:
        return const Row(children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(
                strokeWidth: 1.5, color: Color(0xFFD97706)),
          ),
          SizedBox(width: 6),
          Text('Awaiting cashier verification…',
              style: TextStyle(fontSize: 11, color: Color(0xFFD97706))),
        ]);
      case 'awaiting_payment' when isXendit:
        return const Row(children: [
          SizedBox(
            width: 12,
            height: 12,
            child: CircularProgressIndicator(
                strokeWidth: 1.5, color: Color(0xFF2563EB)),
          ),
          SizedBox(width: 6),
          Expanded(
            child: Text('Waiting for Xendit confirmation…',
                style: TextStyle(fontSize: 11, color: Color(0xFF2563EB))),
          ),
        ]);
      case 'failed':
        return const Text('Payment failed or Xendit checkout expired.',
            style: TextStyle(fontSize: 11, color: Color(0xFFDC2626)));
      case 'cancelled':
        return const Text('Checkout cancelled.',
            style: TextStyle(fontSize: 11, color: Colors.grey));
      case 'rejected':
        final notes = p['notes'] as String?;
        return Text(
          notes != null ? 'Rejected: $notes' : 'Payment rejected.',
          style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626)),
        );
      default:
        return const SizedBox.shrink();
    }
  }
}
