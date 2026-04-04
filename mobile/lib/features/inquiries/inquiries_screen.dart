import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';

class InquiriesScreen extends StatelessWidget {
  const InquiriesScreen({super.key});

  Future<void> _openEmail() async {
    final uri = Uri.parse('mailto:admin@sis.edu.ph?subject=MOIST%20Portal%20Inquiry');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
  }

  @override
  Widget build(BuildContext context) {
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
                      'Inquiries / Concern',
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
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const MoistPageHeader(
            eyebrow: 'Support',
            title: 'Need help with your enrollment?',
            subtitle: 'Check the right office below so your concern reaches the correct person faster.',
          ),
          const SizedBox(height: 18),
          const _OfficeCard(
            icon: Icons.app_registration_rounded,
            title: 'Registrar',
            subtitle: 'Account approval, student records, final enrollment, printed copies.',
            color: AppTheme.maroon,
          ),
          const SizedBox(height: 10),
          const _OfficeCard(
            icon: Icons.fact_check_rounded,
            title: 'Dean / Program Head',
            subtitle: 'Subject evaluation, qualification, load review, conflict and overload concerns.',
            color: AppTheme.warning,
          ),
          const SizedBox(height: 10),
          const _OfficeCard(
            icon: Icons.payments_rounded,
            title: 'Cashier / Finance',
            subtitle: 'Enrollment fee payment, receipt concerns, finance copy verification.',
            color: AppTheme.success,
          ),
          const SizedBox(height: 10),
          const _OfficeCard(
            icon: Icons.support_agent_rounded,
            title: 'Portal Support',
            subtitle: 'Login issues, app access, or technical problems inside the student portal.',
            color: Color(0xFF2563EB),
          ),
          const SizedBox(height: 18),
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Contact Channel',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: AppTheme.ink),
                ),
                const SizedBox(height: 6),
                Text(
                  'Send your concern through the SIS support email. You can include your student number, semester, and screenshot for faster assistance.',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
                ),
                const SizedBox(height: 14),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppTheme.paperSoft,
                    borderRadius: BorderRadius.circular(18),
                  ),
                  child: const Text(
                    'admin@sis.edu.ph',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: AppTheme.maroon,
                      letterSpacing: 0.3,
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _openEmail,
                    icon: const Icon(Icons.email_rounded),
                    label: const Text('Send Inquiry'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OfficeCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;

  const _OfficeCard({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 46,
            height: 46,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppTheme.ink),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade700, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
