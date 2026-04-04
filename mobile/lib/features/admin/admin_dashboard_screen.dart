import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import 'qr_scanner_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _totalStudents = 0;
  int _totalPayments = 0;
  int _totalEnrollments = 0;
  Map<String, dynamic>? _activeTerm;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
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
      if (auth.isStaff) {
        final res = await ApiClient().dio.get('/enrollment-batches', queryParameters: {
          ...termQuery,
          'status': 'for_assessment',
        });
        if (!mounted) return;
        setState(() {
          _activeTerm = activeTerm;
          _totalStudents = 0;
          _totalPayments = 0;
          _totalEnrollments = res.data['total'] as int? ?? 0;
          _loading = false;
        });
        return;
      }

      final results = await Future.wait([
        ApiClient().dio.get('/enrollment-batches', queryParameters: termQuery),
        ApiClient().dio.get('/payments', queryParameters: termQuery),
        ApiClient().dio.get('/enrollment-batches', queryParameters: {
          ...termQuery,
          'status': 'enrolled',
        }),
      ]);
      if (!mounted) return;
      setState(() {
        _activeTerm = activeTerm;
        _totalStudents = results[0].data['total'] as int? ?? 0;
        _totalPayments = results[1].data['total'] as int? ?? 0;
        _totalEnrollments = results[2].data['total'] as int? ?? 0;
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
    final isStaff = auth.isStaff;

    return _loading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _load,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF5a0d1a), Color(0xFF7a1324), Color(0xFFa01830)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(20),
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
                                style: TextStyle(color: Colors.white, fontSize: 15,
                                    fontWeight: FontWeight.w900, letterSpacing: 1)),
                              const SizedBox(height: 2),
                              Text(
                                'Welcome, ${auth.user?['role'] == 'admin' ? 'Admin' : 'Staff'}',
                                style: const TextStyle(color: Colors.white70, fontSize: 12),
                              ),
                              Text(
                                auth.user?['email'] ?? '',
                                style: const TextStyle(color: Colors.white, fontSize: 13,
                                    fontWeight: FontWeight.w600),
                                overflow: TextOverflow.ellipsis,
                              ),
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
                ),
                const SizedBox(height: 16),
                const Text('Overview', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (!isStaff) ...[
                      _StatCard(label: 'Term Students', value: _totalStudents, icon: Icons.people, color: Colors.blue),
                      const SizedBox(width: 8),
                    ],
                    _StatCard(
                      label: isStaff ? 'For Approval' : 'Enrolled',
                      value: _totalEnrollments,
                      icon: Icons.list_alt,
                      color: Colors.green,
                    ),
                    if (!isStaff) ...[
                      const SizedBox(width: 8),
                      _StatCard(label: 'Term Payments', value: _totalPayments, icon: Icons.payment, color: Colors.purple),
                    ],
                  ],
                ),
                const SizedBox(height: 20),
                const Text('Quick Actions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 8),
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: isStaff
                      ? [
                          _ActionCard(
                            icon: Icons.fact_check_rounded,
                            label: 'Approve Evaluation',
                            color: Colors.green,
                            onTap: () => context.go('/admin/enrollments'),
                          ),
                        ]
                      : [
                          _ActionCard(
                            icon: Icons.menu_book_rounded,
                            label: 'Subjects',
                            color: Colors.indigo,
                            onTap: () => context.go('/admin/subjects'),
                          ),
                          _ActionCard(
                            icon: Icons.people,
                            label: 'Manage Students',
                            color: Colors.blue,
                            onTap: () => context.go('/admin/students'),
                          ),
                          _ActionCard(
                            icon: Icons.grade,
                            label: 'Encode Grades',
                            color: Colors.orange,
                            onTap: () => context.go('/admin/grades'),
                          ),
                          _ActionCard(
                            icon: Icons.list_alt,
                            label: 'Enrollments',
                            color: Colors.green,
                            onTap: () => context.go('/admin/enrollments'),
                          ),
                          _ActionCard(
                            icon: Icons.payment,
                            label: 'Payments',
                            color: Colors.purple,
                            onTap: () => context.go('/admin/payments'),
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

class _StatCard extends StatelessWidget {
  final String label;
  final int value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: color, size: 24),
              const SizedBox(height: 4),
              Text('$value', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
              Text(label, style: const TextStyle(fontSize: 10, color: Colors.grey), textAlign: TextAlign.center),
            ],
          ),
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

  const _ActionCard({required this.icon, required this.label, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 32),
              const SizedBox(height: 6),
              Text(
                label,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
