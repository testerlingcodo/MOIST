import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';
import '../notifications/student_notification_center.dart';
import '../../shared/widgets/moist_brand.dart';

// ─── Branded AppBar helper ────────────────────────────────────
AppBar moistStudentAppBar({
  required BuildContext context,
  String subtitle = 'Student Portal',
  List<Widget>? actions,
}) {
  return AppBar(
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
                  subtitle,
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
    actions: actions ??
        [
          const _StudentNotificationButton(),
          const SizedBox(width: 4),
        ],
  );
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  Map<String, dynamic>? _student;
  Map<String, dynamic>? _batch;
  // _headerLoading only dims the info card — grid is always visible
  bool _headerLoading = true;

  @override
  void initState() {
    super.initState();
    // Defer until after the first frame so setState is never called
    // synchronously inside initState (which freezes the UI).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _load();
    });
  }

  Future<void> _load() async {
    if (!mounted) return;
    // Only flip the loading flag when it's currently off (pull-to-refresh).
    // On first load _headerLoading is already true — no setState needed.
    if (!_headerLoading) setState(() => _headerLoading = true);

    final auth = context.read<AuthService>();
    final studentId = auth.studentId;
    if (studentId == null) {
      if (mounted) setState(() => _headerLoading = false);
      return;
    }

    // ── 1. Student profile ────────────────────────────────────
    Map<String, dynamic>? student;
    try {
      final res = await ApiClient().dio.get('/students/$studentId');
      if (res.data is Map) {
        student = Map<String, dynamic>.from(res.data as Map);
      }
    } catch (_) {}

    // ── 2. Active term (failure is non-fatal) ─────────────────
    Map<String, dynamic>? activeTerm;
    try {
      final res = await ApiClient().dio.get('/academic-settings/active');
      if (res.data is Map) {
        activeTerm = Map<String, dynamic>.from(res.data as Map);
      }
    } catch (_) {}

    // ── 3. Enrollment batch for active term ───────────────────
    Map<String, dynamic>? batch;
    if (activeTerm != null) {
      try {
        final listRes = await ApiClient().dio.get(
          '/enrollment-batches',
          queryParameters: {
            'school_year': activeTerm['school_year'],
            'semester':    activeTerm['semester'],
            'limit': 1,
          },
        );
        final list = List<dynamic>.from(
          listRes.data['data'] as List? ?? const [],
        );
        if (list.isNotEmpty) {
          final batchRes = await ApiClient().dio
              .get('/enrollment-batches/${list.first['id']}');
          if (batchRes.data is Map) {
            batch = Map<String, dynamic>.from(batchRes.data as Map);
          }
        }
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() {
      _student       = student;
      _batch         = batch;
      _headerLoading = false;
    });
  }


  String _processLabel(String? status) {
    switch (status) {
      case 'pending':              return 'Enroll Draft';
      case 'for_subject_enrollment':
      case 'for_evaluation':       return 'To Be Evaluated';
      case 'for_assessment':
      case 'evaluated':            return 'For Approval';
      case 'for_registration':
      case 'approved':             return 'For Registrar';
      case 'for_payment':          return 'For Payment';
      case 'enrolled':             return 'Enrolled';
      default:                     return 'No Active Process';
    }
  }

  @override
  Widget build(BuildContext context) {
    // Features grid is ALWAYS rendered — never hidden behind a full-screen loader.
    // Only the student info header dims while data loads.
    final auth = context.read<AuthService>();
    final notificationCenter = context.watch<StudentNotificationCenter>();
    final studentName = _student != null
        ? '${_student!['first_name'] ?? ''} ${_student!['last_name'] ?? ''}'.trim()
        : auth.user?['email'] ?? 'Student';
    final currentStatus =
        (_batch?['status'] ?? _student?['enrollment_process_status']) as String?;

    return Scaffold(
      backgroundColor: AppTheme.surface,
      appBar: moistStudentAppBar(context: context),
      // Entire home fits on one screen — no scrolling.
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // ── Compact student info strip (replaces bulky MoistPageHeader
          //    + separate progress card — saves ~80 dp on small screens) ──
          AnimatedOpacity(
            opacity: _headerLoading ? 0.65 : 1.0,
            duration: const Duration(milliseconds: 280),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 12, 16, 0),
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              decoration: BoxDecoration(
                gradient: AppTheme.maroonGradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.maroon.withValues(alpha: 0.28),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  const MoistSealBadge(size: 42),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _headerLoading ? '— — — —' : studentName,
                          style: const TextStyle(
                              color: Colors.white,
                              fontSize: 14,
                              fontWeight: FontWeight.w800),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          _headerLoading
                              ? 'Fetching info…'
                              : '${_student?['student_number'] ?? '-'}  ·  '
                                  '${_student?['course'] ?? '—'}  ·  '
                                  'Year ${_student?['year_level'] ?? '-'}',
                          style: TextStyle(
                              color: Colors.white.withValues(alpha: 0.72),
                              fontSize: 10.5),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 3),
                        Text(
                          _headerLoading
                              ? 'Loading status…'
                              : _processLabel(currentStatus),
                          style: const TextStyle(
                              color: AppTheme.goldStrong,
                              fontSize: 11,
                              fontWeight: FontWeight.w700),
                          maxLines: 1,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  _headerLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 1.8,
                            valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white70),
                          ),
                        )
                      : StatusBadge(
                          label: _processLabel(currentStatus).toUpperCase(),
                          color: currentStatus == 'enrolled'
                              ? AppTheme.success
                              : (currentStatus == 'for_subject_enrollment' ||
                                      currentStatus == 'for_evaluation')
                                  ? AppTheme.warning
                                  : AppTheme.goldStrong,
                        ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 10),
          if (notificationCenter.hasUnread) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: _DashboardNotificationBanner(
                unreadCount: notificationCenter.unreadCount,
                latestItem: notificationCenter.latestUnread,
              ),
            ),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: SectionHeader(title: 'Quick Access'),
          ),
          const SizedBox(height: 8),

          // ── Grid fills ALL remaining space.
          // LayoutBuilder measures exact available height → computes cellH.
          // compact=true when cells are short (small screens): hides subtitle,
          // shrinks icon/padding so content never overflows.
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: LayoutBuilder(
                builder: (ctx, constraints) {
                  const sp = 10.0;
                  final quickActions = <Map<String, dynamic>>[
                    {
                      'icon': Icons.playlist_add_check_circle_rounded,
                      'label': 'Enroll Now',
                      'subtitle': 'Submit request',
                      'color': AppTheme.maroon,
                      'bgColor': AppTheme.paperSoft,
                      'onTap': () => context.go('/enroll'),
                    },
                    {
                      'icon': Icons.schedule_rounded,
                      'label': 'My Schedule',
                      'subtitle': 'Class times & rooms',
                      'color': AppTheme.goldStrong,
                      'bgColor': const Color(0xFFFFF1C6),
                      'onTap': () => context.go('/schedule'),
                    },
                    {
                      'icon': Icons.receipt_long_rounded,
                      'label': 'Payments',
                      'subtitle': 'Fees & SOA records',
                      'color': AppTheme.success,
                      'bgColor': const Color(0xFFECFDF5),
                      'onTap': () => context.go('/payments'),
                    },
                    {
                      'icon': Icons.contact_support_rounded,
                      'label': 'Inquiries',
                      'subtitle': 'Concerns & help',
                      'color': AppTheme.maroonSoft,
                      'bgColor': const Color(0xFFFFEEF1),
                      'onTap': () => context.go('/inquiries'),
                    },
                    {
                      'icon': Icons.grade_rounded,
                      'label': 'My Grades',
                      'subtitle': 'Academic performance',
                      'color': const Color(0xFF2563EB),
                      'bgColor': const Color(0xFFEFF6FF),
                      'onTap': () => context.go('/grades'),
                    },
                    {
                      'icon': Icons.list_alt_rounded,
                      'label': 'Prospectus',
                      'subtitle': 'Full subject overview',
                      'color': AppTheme.maroon,
                      'bgColor': AppTheme.paperSoft,
                      'onTap': () => context.go('/prospectus'),
                    },
                    {
                      'icon': Icons.description_rounded,
                      'label': 'Documents',
                      'subtitle': 'Request & track status',
                      'color': const Color(0xFF0F766E),
                      'bgColor': const Color(0xFFE6FFFB),
                      'onTap': () => context.go('/documents'),
                    },
                    {
                      'icon': Icons.person_rounded,
                      'label': 'My Profile',
                      'subtitle': 'Details & student QR',
                      'color': AppTheme.warning,
                      'bgColor': const Color(0xFFFFFBEB),
                      'onTap': () => context.go('/profile'),
                    },
                  ];

                  final cols = constraints.maxWidth >= 900
                      ? 4
                      : constraints.maxWidth >= 640
                          ? 3
                          : 2;
                  final rows = (quickActions.length / cols).ceil();
                  final cellW =
                      (constraints.maxWidth - sp * (cols - 1)) / cols;
                  final cellH = ((constraints.maxHeight - sp * (rows - 1)) /
                          rows)
                      .clamp(64.0, 200.0);
                  final compact = cellH < 100;
                  return GridView.builder(
                    itemCount: quickActions.length,
                    gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: cols,
                      childAspectRatio: cellW / cellH,
                      crossAxisSpacing: sp,
                      mainAxisSpacing: sp,
                    ),
                    physics: const NeverScrollableScrollPhysics(),
                    itemBuilder: (context, index) {
                      final action = quickActions[index];
                      return _QuickCard(
                        icon: action['icon'] as IconData,
                        label: action['label'] as String,
                        subtitle: action['subtitle'] as String,
                        color: action['color'] as Color,
                        bgColor: action['bgColor'] as Color,
                        compact: compact,
                        onTap: action['onTap'] as VoidCallback,
                      );
                    },
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StudentNotificationButton extends StatelessWidget {
  const _StudentNotificationButton();

  @override
  Widget build(BuildContext context) {
    final unreadCount =
        context.select((StudentNotificationCenter center) => center.unreadCount);

    return IconButton(
      onPressed: () => context.go('/notifications'),
      tooltip: 'Notifications',
      icon: Stack(
        clipBehavior: Clip.none,
        children: [
          Icon(
            unreadCount > 0
                ? Icons.notifications_active_rounded
                : Icons.notifications_outlined,
            size: 22,
            color: Colors.white.withValues(alpha: 0.88),
          ),
          if (unreadCount > 0)
            Positioned(
              right: -6,
              top: -4,
              child: Container(
                constraints: const BoxConstraints(minWidth: 18, minHeight: 18),
                padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(999),
                  border: Border.all(color: AppTheme.maroonDark, width: 1.5),
                ),
                child: Text(
                  unreadCount > 99 ? '99+' : '$unreadCount',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    height: 1.1,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _DashboardNotificationBanner extends StatelessWidget {
  final int unreadCount;
  final Map<String, dynamic>? latestItem;

  const _DashboardNotificationBanner({
    required this.unreadCount,
    required this.latestItem,
  });

  @override
  Widget build(BuildContext context) {
    final title = latestItem?['title']?.toString().trim();
    final body = (latestItem?['body'] ??
            latestItem?['content'] ??
            latestItem?['message'])
        ?.toString()
        .trim();

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => context.go('/notifications'),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            color: const Color(0xFFFFF4E5),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.22)),
          ),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.notifications_active_rounded,
                  color: Color(0xFFD97706),
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      unreadCount == 1
                          ? '1 new notification'
                          : '$unreadCount new notifications',
                      style: const TextStyle(
                        color: AppTheme.ink,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    if (title != null && title.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppTheme.ink,
                          fontSize: 12,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                    if (body != null && body.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(
                        body,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          color: Colors.grey.shade700,
                          fontSize: 11,
                          height: 1.2,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFFD97706),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _QuickCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final Color bgColor;
  final bool compact;
  final VoidCallback onTap;

  const _QuickCard({
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.bgColor,
    this.compact = false,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      onTap: onTap,
      padding: EdgeInsets.fromLTRB(
        compact ? 12 : 14,
        compact ? 10 : 14,
        compact ? 12 : 14,
        compact ? 10 : 16,
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.start,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: compact ? 34 : 42,
            height: compact ? 34 : 42,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [color.withValues(alpha: 0.18), bgColor],
              ),
              borderRadius: BorderRadius.circular(compact ? 11 : 14),
              border: Border.all(color: color.withValues(alpha: 0.12)),
            ),
            child: Icon(icon, color: color, size: compact ? 18 : 22),
          ),
          const Spacer(),
          Text(
            label,
            textAlign: TextAlign.left,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: compact ? 11 : 12,
              color: AppTheme.ink,
              letterSpacing: 0.1,
            ),
          ),
          if (!compact) ...[
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.left,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 10,
                color: Colors.grey.shade500,
                height: 1.3,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
