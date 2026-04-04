import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class CashierDashboardScreen extends StatefulWidget {
  const CashierDashboardScreen({super.key});

  @override
  State<CashierDashboardScreen> createState() => _CashierDashboardScreenState();
}

class _CashierDashboardScreenState extends State<CashierDashboardScreen> {
  int _totalPayments = 0;
  int _pendingPayments = 0;
  Map<String, dynamic>? _activeTerm;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      Map<String, dynamic>? activeTerm;
      try {
        final termRes = await ApiClient().dio.get('/academic-settings/active');
        if (termRes.data is Map) {
          activeTerm = Map<String, dynamic>.from(termRes.data as Map);
        }
      } catch (_) {}
      final termQuery = <String, dynamic>{
        'limit': 1,
        if (activeTerm?['school_year'] != null) 'school_year': activeTerm!['school_year'],
        if (activeTerm?['semester'] != null) 'semester': activeTerm!['semester'],
      };
      final results = await Future.wait([
        ApiClient().dio.get('/payments', queryParameters: termQuery),
        ApiClient().dio.get('/payments', queryParameters: {...termQuery, 'status': 'pending'}),
      ]);
      if (!mounted) return;
      setState(() {
        _activeTerm = activeTerm;
        _totalPayments = results[0].data['total'] as int? ?? 0;
        _pendingPayments = results[1].data['total'] as int? ?? 0;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final email = auth.user?['email'] as String? ?? '';

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF5a0d1a), Color(0xFF7a1324), Color(0xFFa01830)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    children: [
                      Image.asset(
                        'assets/images/moist-seal.png',
                        width: 56,
                        height: 56,
                        errorBuilder: (_, __, ___) =>
                            const Icon(Icons.account_balance_wallet_rounded, color: Colors.white, size: 48),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('MOIST, INC.',
                              style: TextStyle(color: Colors.white, fontSize: 14,
                                  fontWeight: FontWeight.w900, letterSpacing: 1)),
                            const SizedBox(height: 2),
                            const Text('Welcome, Cashier',
                              style: TextStyle(color: Colors.white70, fontSize: 12)),
                            Text(email,
                              style: const TextStyle(color: Colors.white, fontSize: 13,
                                  fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis),
                            if (_activeTerm != null)
                              Text(
                                '${_activeTerm!['school_year']} • ${_activeTerm!['semester']} Sem',
                                style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _StatCard(
                      label: 'Term Payments',
                      value: _totalPayments,
                      icon: Icons.payments_rounded,
                      color: AppTheme.success,
                    ),
                    const SizedBox(width: 8),
                    _StatCard(
                      label: 'Pending',
                      value: _pendingPayments,
                      icon: Icons.schedule_rounded,
                      color: AppTheme.warning,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const SectionHeader(title: 'Quick Actions'),
                const SizedBox(height: 12),
                AppCard(
                  onTap: () => context.go('/cashier/payments'),
                  child: Row(
                    children: [
                      Container(
                        width: 46,
                        height: 46,
                        decoration: BoxDecoration(
                          color: AppTheme.success.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Icon(Icons.receipt_long_rounded, color: AppTheme.success),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Manage Payments',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 14,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            SizedBox(height: 2),
                            Text(
                              'Create payment links, record balances, and review payment history.',
                              style: TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                          ],
                        ),
                      ),
                      const Icon(Icons.chevron_right_rounded, color: Colors.grey),
                    ],
                  ),
                ),
              ],
            ),
          );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: AppCard(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              '$value',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
