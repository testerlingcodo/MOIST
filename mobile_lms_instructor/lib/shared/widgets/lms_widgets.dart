import 'package:flutter/material.dart';
import '../../core/theme/lms_theme.dart';

// ─────────────────────────────────────────────────────────────────────────────
//  LMS AppBar
// ─────────────────────────────────────────────────────────────────────────────

AppBar lmsAppBar({
  required BuildContext context,
  String subtitle = 'E-Learning Portal',
  List<Widget>? actions,
  bool showBack = false,
}) {
  return AppBar(
    automaticallyImplyLeading: showBack,
    backgroundColor: LMSTheme.maroonDark,
    foregroundColor: Colors.white,
    elevation: 0,
    scrolledUnderElevation: 0,
    titleSpacing: showBack ? 0 : 16,
    leading: showBack
        ? IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
            onPressed: () => Navigator.of(context).pop(),
          )
        : null,
    title: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _SealBadge(size: showBack ? 28 : 32),
        const SizedBox(width: 10),
        Flexible(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('MOIST, INC.',
                style: TextStyle(
                  color: LMSTheme.goldStrong, fontSize: 10,
                  fontWeight: FontWeight.w900, letterSpacing: 1.2, height: 1.1,
                )),
              Text(subtitle,
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.9),
                  fontSize: 13, fontWeight: FontWeight.w700, height: 1.1,
                )),
            ],
          ),
        ),
      ],
    ),
    actions: actions ?? const [],
  );
}

class _SealBadge extends StatelessWidget {
  final double size;
  const _SealBadge({required this.size});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size, height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: Colors.white.withValues(alpha: 0.12),
        border: Border.all(
          color: LMSTheme.goldStrong.withValues(alpha: 0.35), width: 1.5),
      ),
      child: Padding(
        padding: EdgeInsets.all(size * 0.12),
        child: Image.asset(
          'assets/images/moist-seal.png',
          fit: BoxFit.contain,
          errorBuilder: (_, __, ___) =>
              Icon(Icons.menu_book_rounded, color: Colors.white, size: size * 0.55),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  LMS Card
// ─────────────────────────────────────────────────────────────────────────────

class LMSCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? color;
  final VoidCallback? onTap;

  const LMSCard({super.key, required this.child, this.padding, this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    const radius = BorderRadius.all(Radius.circular(20));
    return Container(
      decoration: BoxDecoration(
        color: color ?? LMSTheme.cardBg,
        borderRadius: radius,
        border: Border.all(color: LMSTheme.maroon.withValues(alpha: 0.055)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7A1324).withValues(alpha: 0.07),
            blurRadius: 20, offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4, offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          splashColor: LMSTheme.maroon.withValues(alpha: 0.06),
          highlightColor: LMSTheme.maroon.withValues(alpha: 0.04),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Section Header
// ─────────────────────────────────────────────────────────────────────────────

class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  const SectionHeader({super.key, required this.title, this.action});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(title, style: const TextStyle(
          fontSize: 16, fontWeight: FontWeight.w800,
          color: LMSTheme.ink, letterSpacing: 0.1,
        )),
        if (action != null) action!,
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Status Badge
// ─────────────────────────────────────────────────────────────────────────────

class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;
  const StatusBadge({super.key, required this.label, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Text(label,
        style: TextStyle(
          fontSize: 10, fontWeight: FontWeight.w700,
          color: color, letterSpacing: 0.6,
        )),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Empty State
// ─────────────────────────────────────────────────────────────────────────────

class LMSEmptyState extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;

  const LMSEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(48),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                color: LMSTheme.maroon.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: LMSTheme.maroon, size: 32),
            ),
            const SizedBox(height: 16),
            Text(title, style: const TextStyle(
              fontSize: 16, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
            const SizedBox(height: 6),
            Text(subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: Colors.grey.shade500)),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Feature Tile (used in dashboard)
// ─────────────────────────────────────────────────────────────────────────────

class FeatureTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String subtitle;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  const FeatureTile({
    super.key,
    required this.icon,
    required this.label,
    required this.subtitle,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return LMSCard(
      onTap: onTap,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(
              color: bgColor,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withValues(alpha: 0.12)),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(label, style: const TextStyle(
                  fontSize: 12, fontWeight: FontWeight.w800, color: LMSTheme.ink),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 10, color: Colors.grey.shade500),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
