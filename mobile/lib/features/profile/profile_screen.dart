import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Map<String, dynamic>? _student;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final studentId = context.read<AuthService>().studentId;
    if (studentId == null) { setState(() => _loading = false); return; }
    try {
      final res = await ApiClient().dio.get('/students/$studentId');
      setState(() { _student = Map<String, dynamic>.from(res.data as Map); _loading = false; });
    } catch (_) { setState(() => _loading = false); }
  }

  void _showQRCode() {
    final studentNumber = _student?['student_number'] as String? ?? '';
    final studentId = _student?['id'] as String? ?? '';
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (sheetContext) {
        final media = MediaQuery.of(sheetContext);
        final qrSize = (media.size.width - 112).clamp(160.0, 220.0);

        return SafeArea(
          top: false,
          child: SingleChildScrollView(
            padding: EdgeInsets.fromLTRB(
              24,
              20,
              24,
              24 + media.viewPadding.bottom,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 40, height: 4, decoration: BoxDecoration(
                  color: Colors.grey.shade200, borderRadius: BorderRadius.circular(2))),
                const SizedBox(height: 20),
                const Text('My QR Code', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                const SizedBox(height: 4),
                Text('Show this to your teacher or admin', style: TextStyle(color: Colors.grey.shade500, fontSize: 13)),
                const SizedBox(height: 20),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 20)],
                  ),
                  child: QrImageView(
                    data: 'SIS-STUDENT:$studentId:$studentNumber',
                    version: QrVersions.auto,
                    size: qrSize,
                    eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: AppTheme.primary),
                    dataModuleStyle: const QrDataModuleStyle(
                      dataModuleShape: QrDataModuleShape.square,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  studentNumber,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 2),
                ),
                const SizedBox(height: 4),
                Text(
                  '${_student?['first_name']} ${_student?['last_name']}',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey.shade500, fontSize: 13),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _infoRow(IconData icon, String label, String? value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 10),
    child: Row(children: [
      Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: AppTheme.primary.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(8)),
        child: Icon(icon, size: 16, color: AppTheme.primary),
      ),
      const SizedBox(width: 12),
      Expanded(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500, fontWeight: FontWeight.w500)),
          const SizedBox(height: 2),
          Text(value ?? '—', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF1E293B))),
        ]),
      ),
    ]),
  );

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      body: _loading
        ? const Center(child: CircularProgressIndicator())
        : CustomScrollView(
          slivers: [
            // Profile header
            SliverAppBar(
              expandedHeight: 230,
              pinned: true,
              backgroundColor: AppTheme.maroonDark,
              foregroundColor: Colors.white,
              automaticallyImplyLeading: false,
              title: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const MoistSealBadge(size: 28),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Text(
                          'MOIST, INC.',
                          style: TextStyle(
                            color: AppTheme.goldStrong,
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.2,
                            height: 1.0,
                          ),
                        ),
                        Text(
                          'My Profile',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.9),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            height: 1.0,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  icon: const Icon(Icons.logout_rounded),
                  onPressed: auth.logout,
                  tooltip: 'Sign Out',
                ),
              ],
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft, end: Alignment.bottomRight,
                      colors: [AppTheme.maroonDark, AppTheme.maroon, AppTheme.maroonSoft],
                    ),
                  ),
                  child: SafeArea(
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      const SizedBox(height: 48),
                      Container(
                        width: 80, height: 80,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.2),
                          shape: BoxShape.circle,
                          border: Border.all(color: AppTheme.goldStrong.withValues(alpha: 0.6), width: 2),
                        ),
                        child: Center(
                          child: Text(
                            _student != null ? (_student!['last_name'] as String)[0].toUpperCase() : '?',
                            style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: Colors.white),
                          ),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        _student != null ? '${_student!['first_name']} ${_student!['last_name']}' : auth.user?['email'] ?? '',
                        style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white),
                      ),
                      const SizedBox(height: 4),
                      Text(_student?['student_number'] ?? '',
                        style: TextStyle(fontSize: 13, color: AppTheme.goldStrong.withValues(alpha: 0.85), letterSpacing: 1, fontWeight: FontWeight.w600)),
                    ]),
                  ),
                ),
              ),
            ),

            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(children: [
                  // QR Code button
                  AppCard(
                    onTap: _showQRCode,
                    child: Row(children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppTheme.primary, AppTheme.primaryLight]),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.qr_code_2_rounded, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 14),
                      const Expanded(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('My QR Code', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                          Text('Tap to show your student QR code',
                            style: TextStyle(fontSize: 12, color: Colors.grey)),
                        ]),
                      ),
                      Icon(Icons.chevron_right_rounded, color: Colors.grey.shade400),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // Student info card
                  AppCard(
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      const Text('Student Information',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: Color(0xFF1E293B))),
                      const SizedBox(height: 4),
                      Divider(color: Colors.grey.shade100),
                      _infoRow(Icons.badge_outlined, 'Course', _student?['course'] as String?),
                      _infoRow(Icons.school_outlined, 'Year Level',
                        _student?['year_level'] != null ? 'Year ${_student!['year_level']}' : null),
                      _infoRow(Icons.email_outlined, 'Email', _student?['email'] as String?),
                      _infoRow(Icons.phone_outlined, 'Contact', _student?['contact_number'] as String?),
                      _infoRow(Icons.location_on_outlined, 'Address', _student?['address'] as String?),
                      _infoRow(Icons.circle_outlined, 'Status',
                        (_student?['status'] as String?)?.toUpperCase()),
                    ]),
                  ),
                  const SizedBox(height: 16),

                  // Sign out button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: auth.logout,
                      icon: const Icon(Icons.logout_rounded, size: 18),
                      label: const Text('Sign Out'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: AppTheme.danger,
                        side: BorderSide(color: AppTheme.danger.withValues(alpha: 0.5)),
                      ),
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
    );
  }
}
