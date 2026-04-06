import 'package:flutter/material.dart';

class LMSTheme {
  // ── Core MOIST palette ───────────────────────────────────────
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
  static const Color success    = Color(0xFF10B981);
  static const Color warning    = Color(0xFFE9A300);
  static const Color danger     = Color(0xFFEF4444);
  static const Color surface    = Color(0xFFF5F3F0);
  static const Color cardBg     = Color(0xFFFFFEFB);

  // ── LMS accent colours ──────────────────────────────────────
  static const Color lmsBlue   = Color(0xFF2563EB);
  static const Color lmsGreen  = Color(0xFF059669);
  static const Color lmsPurple = Color(0xFF7C3AED);
  static const Color lmsTeal   = Color(0xFF0F766E);
  static const Color lmsOrange = Color(0xFFEA580C);

  // ── Gradients ───────────────────────────────────────────────
  static const LinearGradient maroonGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [maroonDark, maroon, maroonSoft],
  );

  static const LinearGradient splashGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF3B0610), Color(0xFF6B1020), Color(0xFF8B1A2E)],
  );

  static const LinearGradient loginGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF5a0d1a), Color(0xFF7a1324), Color(0xFFa01830)],
  );

  // ── ThemeData ───────────────────────────────────────────────
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
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: _SmoothPageTransition(),
      TargetPlatform.iOS:     _SmoothPageTransition(),
      TargetPlatform.fuchsia: _SmoothPageTransition(),
    }),
    appBarTheme: const AppBarTheme(
      backgroundColor: paper,
      foregroundColor: ink,
      elevation: 0,
      centerTitle: false,
      scrolledUnderElevation: 0,
      titleTextStyle: TextStyle(
        color: ink, fontSize: 18,
        fontWeight: FontWeight.w800, letterSpacing: 0.2,
      ),
    ),
    cardTheme: CardThemeData(
      color: cardBg, elevation: 0,
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
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700, letterSpacing: 0.3),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: primary,
        side: const BorderSide(color: primary, width: 1.5),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
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
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: Colors.white,
      elevation: 0, height: 68,
      surfaceTintColor: Colors.transparent,
      indicatorColor: maroon.withValues(alpha: 0.11),
      indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final sel = states.contains(WidgetState.selected);
        return TextStyle(
          fontSize: 11,
          fontWeight: sel ? FontWeight.w700 : FontWeight.w400,
          color: sel ? maroon : const Color(0xFF9CA3AF),
          letterSpacing: 0.2,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) {
        final sel = states.contains(WidgetState.selected);
        return IconThemeData(color: sel ? maroon : const Color(0xFF9CA3AF), size: 22);
      }),
    ),
    dividerTheme: const DividerThemeData(color: Color(0xFFF0E8EA), thickness: 1),
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
    PageRoute<T> route, BuildContext context,
    Animation<double> animation, Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final fadeIn = CurvedAnimation(parent: animation,
        curve: const Interval(0.0, 0.85, curve: Curves.easeOutCubic));
    final slideIn = CurvedAnimation(parent: animation, curve: Curves.easeOutCubic);
    final fadeOut = CurvedAnimation(parent: secondaryAnimation,
        curve: const Interval(0.0, 0.5, curve: Curves.easeIn));
    return FadeTransition(
      opacity: Tween<double>(begin: 0.0, end: 1.0).animate(fadeIn),
      child: FadeTransition(
        opacity: Tween<double>(begin: 1.0, end: 0.94).animate(fadeOut),
        child: SlideTransition(
          position: Tween<Offset>(begin: const Offset(0.03, 0.0), end: Offset.zero).animate(slideIn),
          child: child,
        ),
      ),
    );
  }
}
