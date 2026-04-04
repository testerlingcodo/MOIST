import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../admin/qr_scanner_screen.dart';

class TeacherDashboardScreen extends StatefulWidget {
  const TeacherDashboardScreen({super.key});

  @override
  State<TeacherDashboardScreen> createState() => _TeacherDashboardScreenState();
}

class _TeacherDashboardScreenState extends State<TeacherDashboardScreen> {
  Map<String, dynamic>? _workload;
  Map<String, dynamic>? _activeTerm;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    Map<String, dynamic>? workload;
    Map<String, dynamic>? activeTerm;
    try {
      final res = await ApiClient().dio.get('/teachers/me/workload');
      if (res.data is Map) workload = Map<String, dynamic>.from(res.data as Map);
    } catch (_) {}
    try {
      final res = await ApiClient().dio.get('/academic-settings/active');
      if (res.data is Map) activeTerm = Map<String, dynamic>.from(res.data as Map);
    } catch (_) {}
    if (!mounted) return;
    setState(() {
      _workload   = workload;
      _activeTerm = activeTerm;
      _loading    = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
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
                            const Text('Welcome, Teacher',
                              style: TextStyle(color: Colors.white70, fontSize: 12)),
                            Text(
                              auth.user?['email'] ?? '',
                              style: const TextStyle(color: Colors.white, fontSize: 13,
                                  fontWeight: FontWeight.w600),
                              overflow: TextOverflow.ellipsis,
                            ),
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
                // Assigned subject card
                if ((_workload?['assigned_subject_id']?.toString().isNotEmpty ?? false))
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: Colors.grey.shade100),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 12,
                          offset: const Offset(0, 3),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Subject header stripe
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          decoration: const BoxDecoration(
                            color: Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
                          ),
                          child: Row(children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.menu_book_rounded, size: 18, color: AppTheme.primary),
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'My Assigned Subject',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                                color: Color(0xFF64748B),
                                letterSpacing: 0.3,
                              ),
                            ),
                          ]),
                        ),
                        const Divider(height: 1),
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: AppTheme.primary.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    '${_workload?['assigned_subject_code'] ?? ''}',
                                    style: const TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w800,
                                      color: AppTheme.primary,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ]),
                              const SizedBox(height: 6),
                              Text(
                                '${_workload?['assigned_subject_name'] ?? ''}',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 12),
                              Row(children: [
                                _InfoChip(
                                  icon: Icons.layers_rounded,
                                  label: '${_workload?['assigned_subject_units'] ?? '-'} Units',
                                ),
                                const SizedBox(width: 8),
                                _InfoChip(
                                  icon: Icons.school_rounded,
                                  label: _workload?['assigned_course'] ?? 'All Courses',
                                ),
                              ]),
                            ],
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.amber.shade200),
                    ),
                    child: Row(children: [
                      Icon(Icons.info_outline_rounded, color: Colors.amber.shade800, size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'No subject assigned yet. Contact the admin to complete your teaching assignment.',
                          style: TextStyle(fontSize: 13, color: Colors.amber.shade800),
                        ),
                      ),
                    ]),
                  ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _StatCard(
                      label: 'Term Students',
                      value: _workload?['total_students'] as int? ?? 0,
                      icon: Icons.people_rounded,
                      color: AppTheme.primary,
                    ),
                    const SizedBox(width: 8),
                    _StatCard(
                      label: 'Encoded',
                      value: _workload?['total_grades'] as int? ?? 0,
                      icon: Icons.edit_note_rounded,
                      color: AppTheme.accent,
                    ),
                    const SizedBox(width: 8),
                    _StatCard(
                      label: 'Submitted',
                      value: _workload?['submitted_grades'] as int? ?? 0,
                      icon: Icons.task_alt_rounded,
                      color: AppTheme.success,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                const Row(
                  children: [
                    Text(
                      'Quick Actions',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: [
                    _ActionCard(
                      icon: Icons.grade_rounded,
                      label: 'Encode Grades',
                      color: AppTheme.success,
                      onTap: () => context.go('/teacher/grades'),
                    ),
                    _ActionCard(
                      icon: Icons.people_rounded,
                      label: 'View Students',
                      color: AppTheme.primary,
                      onTap: () => context.go('/teacher/students'),
                    ),
                    _ActionCard(
                      icon: Icons.qr_code_scanner_rounded,
                      label: 'Scan QR Code',
                      color: Colors.teal,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const QrScannerScreen()),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          );
  }
}

class _InfoChip extends StatelessWidget {
  final String label;
  final IconData? icon;

  const _InfoChip({required this.label, this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF1F5F9),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[
          Icon(icon, size: 12, color: const Color(0xFF64748B)),
          const SizedBox(width: 4),
        ],
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Color(0xFF475569), fontWeight: FontWeight.w600),
        ),
      ]),
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
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              '$value',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
            ),
            Text(
              label,
              style: const TextStyle(fontSize: 10, color: Colors.grey),
              textAlign: TextAlign.center,
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
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(height: 8),
          Text(
            label,
            textAlign: TextAlign.center,
            style: const TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: 12,
              color: Color(0xFF1E293B),
            ),
          ),
        ],
      ),
    );
  }
}
