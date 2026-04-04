import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class MoistSealBadge extends StatelessWidget {
  final double size;
  final bool compact;

  const MoistSealBadge({
    super.key,
    this.size = 72,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Image.asset(
      'assets/images/moist-seal.png',
      width: size,
      height: size,
      fit: BoxFit.contain,
      errorBuilder: (_, __, ___) => Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.gold,
          border: Border.all(color: AppTheme.maroon, width: 2),
        ),
        child: Center(
          child: Text(
            'MOIST',
            style: TextStyle(
              fontSize: size * 0.18,
              fontWeight: FontWeight.w900,
              color: AppTheme.maroon,
            ),
          ),
        ),
      ),
    );
  }
}

class MoistPageHeader extends StatelessWidget {
  final String eyebrow;
  final String title;
  final String subtitle;
  final Widget? trailing;

  const MoistPageHeader({
    super.key,
    required this.eyebrow,
    required this.title,
    required this.subtitle,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppTheme.maroonDark, AppTheme.maroon, AppTheme.maroonSoft],
        ),
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: AppTheme.maroon.withValues(alpha: 0.28),
            blurRadius: 28,
            spreadRadius: 0,
            offset: const Offset(0, 10),
          ),
          BoxShadow(
            color: AppTheme.maroon.withValues(alpha: 0.10),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Subtle shine overlay
          Positioned(
            top: -20,
            right: -20,
            child: Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: 0.05),
              ),
            ),
          ),
          Row(
        children: [
          const MoistSealBadge(size: 64, compact: true),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  eyebrow.toUpperCase(),
                  style: TextStyle(
                    color: AppTheme.goldStrong.withValues(alpha: 0.92),
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.4,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  subtitle,
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.78),
                    fontSize: 12,
                    height: 1.35,
                  ),
                ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 12),
            trailing!,
          ],
        ],
      ),
        ],
      ),
    );
  }
}
