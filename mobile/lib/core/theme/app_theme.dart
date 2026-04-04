import 'package:flutter/material.dart';

class AppTheme {
  static const Color maroon     = Color(0xFF7A1324);
  static const Color maroonDark = Color(0xFF5E0D1A);
  static const Color maroonSoft = Color(0xFFA12A3D);
  static const Color gold       = Color(0xFFF6C445);
  static const Color goldStrong = Color(0xFFFFD65A);
  static const Color paper      = Color(0xFFFFFCF7);
  static const Color paperSoft  = Color(0xFFFFF5E5);
  static const Color ink        = Color(0xFF1E0F12);
  static const Color accent     = Color(0xFFF0A81F);
  static const Color primary    = maroon;
  static const Color primaryDark  = maroonDark;
  static const Color primaryLight = maroonSoft;
  static const Color success  = Color(0xFF10B981);
  static const Color warning  = Color(0xFFE9A300);
  static const Color danger   = Color(0xFFEF4444);
  static const Color surface  = Color(0xFFF5F3F0);
  static const Color cardBg   = Color(0xFFFFFEFB);

  // ── Gradient helpers ────────────────────────────────────────
  static const LinearGradient maroonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [maroonDark, maroon, maroonSoft],
  );

  static LinearGradient cardGlow(Color base) => LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [base.withValues(alpha: 0.9), base.withValues(alpha: 0.7)],
  );

  // ── Theme ────────────────────────────────────────────────────
  static ThemeData get light => ThemeData(
    useMaterial3: true,
    fontFamily: 'sans-serif',
    colorScheme: ColorScheme.fromSeed(
      seedColor: primary,
      brightness: Brightness.light,
      primary: primary,
      secondary: accent,
      surface: paper,
    ),
    scaffoldBackgroundColor: surface,

    // ── Smooth page transitions ─────────────────────────────
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: _SmoothPageTransition(),
        TargetPlatform.iOS:     _SmoothPageTransition(),
        TargetPlatform.fuchsia: _SmoothPageTransition(),
      },
    ),

    appBarTheme: const AppBarTheme(
      backgroundColor: paper,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        color: ink,
        fontSize: 18,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.2,
      ),
    ),

    cardTheme: CardThemeData(
      color: cardBg,
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
      margin: EdgeInsets.zero,
    ),

    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: primary,
        foregroundColor: Colors.white,
        elevation: 0,
        shadowColor: Colors.transparent,
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.3,
        ),
      ),
    ),

    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side: const BorderSide(color: primary, width: 1.5),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.2,
        ),
      ),
    ),

    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: primary,
        textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
      ),
    ),

    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: const Color(0xFFFFFCF7),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE8D5D8)),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: Color(0xFFE8D5D8)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: gold, width: 2),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: danger, width: 1.5),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(16),
        borderSide: const BorderSide(color: danger, width: 2),
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 16),
      labelStyle: const TextStyle(color: Color(0xFFAA6070), fontSize: 14),
      floatingLabelStyle: const TextStyle(color: maroon, fontWeight: FontWeight.w600),
      prefixIconColor: WidgetStateColor.resolveWith((states) =>
        states.contains(WidgetState.focused) ? maroon : const Color(0xFFAA8890)),
    ),

    // ── Material 3 NavigationBar ────────────────────────────
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      elevation: 0,
      height: 68,
      surfaceTintColor: Colors.transparent,
      indicatorColor: maroon.withValues(alpha: 0.11),
      indicatorShape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
      ),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final isSelected = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w400,
          color: isSelected ? maroon : const Color(0xFF9CA3AF),
          letterSpacing: 0.2,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final isSelected = states.contains(WidgetState.selected);
        return IconThemeData(
          color: isSelected ? maroon : const Color(0xFF9CA3AF),
          size: 22,
        );
      }),
    ),

    dividerTheme: const DividerThemeData(
      color: Color(0xFFF0E8EA),
      thickness: 1,
    ),

    chipTheme: ChipThemeData(
      backgroundColor: paperSoft,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(999)),
      labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
    ),

    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: const Color(0xFF1E293B),
      contentTextStyle: const TextStyle(color: Colors.white, fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
    ),
  );
}

// ── Smooth fade + micro-slide page transition ─────────────────
class _SmoothPageTransition extends PageTransitionsBuilder {
  const _SmoothPageTransition();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Incoming page: fade in + slight right→center slide
    final fadeIn = CurvedAnimation(
      parent: animation,
      curve: const Interval(0.0, 0.85, curve: Curves.easeOutCubic),
    );
    final slideIn = CurvedAnimation(
      parent: animation,
      curve: Curves.easeOutCubic,
    );
    // Outgoing page: very subtle fade out (no slide back)
    final fadeOut = CurvedAnimation(
      parent: secondaryAnimation,
      curve: const Interval(0.0, 0.5, curve: Curves.easeIn),
    );

    return FadeTransition(
      opacity: Tween<double>(begin: 0.0, end: 1.0).animate(fadeIn),
      child: FadeTransition(
        opacity: Tween<double>(begin: 1.0, end: 0.94).animate(fadeOut),
        child: SlideTransition(
          position: Tween<Offset>(
            begin: const Offset(0.03, 0.0),
            end: Offset.zero,
          ).animate(slideIn),
          child: child,
        ),
      ),
    );
  }
}

// ── Shared widgets ────────────────────────────────────────────

class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsets? padding;
  final Color? color;
  final VoidCallback? onTap;
  final BorderRadius? borderRadius;

  const AppCard({
    super.key,
    required this.child,
    this.padding,
    this.color,
    this.onTap,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final radius = borderRadius ?? BorderRadius.circular(20);
    return Container(
      decoration: BoxDecoration(
        color: color ?? AppTheme.cardBg,
        borderRadius: radius,
        border: Border.all(color: AppTheme.maroon.withValues(alpha: 0.055)),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF7A1324).withValues(alpha: 0.07),
            blurRadius: 20,
            spreadRadius: 0,
            offset: const Offset(0, 6),
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: radius,
        child: InkWell(
          onTap: onTap,
          borderRadius: radius,
          splashColor: AppTheme.maroon.withValues(alpha: 0.06),
          highlightColor: AppTheme.maroon.withValues(alpha: 0.04),
          child: Padding(
            padding: padding ?? const EdgeInsets.all(16),
            child: child,
          ),
        ),
      ),
    );
  }
}

class StatusBadge extends StatelessWidget {
  final String label;
  final Color color;

  const StatusBadge({super.key, required this.label, required this.color});

  factory StatusBadge.fromStatus(String? status) {
    const map = {
      'active':            AppTheme.success,
      'paid':              AppTheme.success,
      'enrolled':          AppTheme.success,
      'passed':            AppTheme.success,
      'pending':           AppTheme.warning,
      'for_evaluation':    AppTheme.warning,
      'dropped':           AppTheme.warning,
      'incomplete':        AppTheme.warning,
      'evaluated':         Color(0xFF2563EB),
      'approved':          Color(0xFF0EA5E9),
      'failed':            AppTheme.danger,
      'inactive':          Colors.grey,
      'refunded':          AppTheme.accent,
      'completed':         AppTheme.accent,
      'graduated':         AppTheme.primary,
    };
    return StatusBadge(
      label: (status ?? 'unknown').toUpperCase(),
      color: map[status] ?? Colors.grey,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.22)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w700,
          color: color,
          letterSpacing: 0.6,
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  final Widget? action;
  const SectionHeader({super.key, required this.title, this.action});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppTheme.ink,
            letterSpacing: 0.1,
          ),
        ),
        if (action != null) action!,
      ],
    );
  }
}
