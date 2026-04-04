import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../admin/qr_scanner_screen.dart';

class DeanDashboardScreen extends StatefulWidget {
  const DeanDashboardScreen({super.key});

  @override
  State<DeanDashboardScreen> createState() => _DeanDashboardScreenState();
}

class _DeanDashboardScreenState extends State<DeanDashboardScreen> {
  Map<String, dynamic>? _activeTerm;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    Map<String, dynamic>? activeTerm;
    try {
      final res = await ApiClient().dio.get('/academic-settings/active');
      if (res.data is Map) {
        activeTerm = Map<String, dynamic>.from(res.data as Map);
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() => _activeTerm = activeTerm);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final email = auth.user?['email'] as String? ?? '';

    return RefreshIndicator(
      onRefresh: _load,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
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
                        const Icon(Icons.school_rounded, color: Colors.white, size: 48),
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
                        const Text('Welcome, Dean',
                          style: TextStyle(color: Colors.white70, fontSize: 12)),
                        Text(email,
                          style: const TextStyle(color: Colors.white, fontSize: 13,
                              fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis),
                        if (_activeTerm != null)
                          Text(
                            '${_activeTerm!['school_year']} | ${_activeTerm!['semester']} Sem',
                            style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            const SectionHeader(title: 'Quick Actions'),
            const SizedBox(height: 12),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.28,
              children: [
                _ActionCard(
                  icon: Icons.menu_book_rounded,
                  label: 'Manage Subjects',
                  color: const Color(0xFF00695C),
                  onTap: () => context.go('/dean/subjects'),
                ),
                _ActionCard(
                  icon: Icons.people_rounded,
                  label: 'View Students',
                  color: AppTheme.primary,
                  onTap: () => context.go('/dean/students'),
                ),
                _ActionCard(
                  icon: Icons.grade_rounded,
                  label: 'View Grades',
                  color: AppTheme.warning,
                  onTap: () => context.go('/dean/grades'),
                ),
                _ActionCard(
                  icon: Icons.list_alt_rounded,
                  label: 'Evaluate Enrollments',
                  color: const Color(0xFF00695C),
                  onTap: () => context.go('/dean/enrollments'),
                ),
                _ActionCard(
                  icon: Icons.school_rounded,
                  label: 'Enrolled Students',
                  color: AppTheme.success,
                  onTap: () => context.go('/dean/enrolled'),
                ),
                _ActionCard(
                  icon: Icons.rate_review_rounded,
                  label: 'Review Grades',
                  color: AppTheme.accent,
                  onTap: () => context.go('/dean/grade-review'),
                ),
                _ActionCard(
                  icon: Icons.qr_code_scanner_rounded,
                  label: 'Scan QR Code',
                  color: const Color(0xFF00695C),
                  onTap: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 10),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              fontSize: 12,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }
}
