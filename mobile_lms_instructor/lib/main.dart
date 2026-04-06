import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/api/api_client.dart';
import 'core/auth/auth_service.dart';
import 'core/theme/lms_theme.dart';
import 'router/app_router.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    statusBarBrightness: Brightness.dark,
    systemNavigationBarColor: Colors.white,
    systemNavigationBarIconBrightness: Brightness.dark,
  ));
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);
  runApp(const LMSInstructorBootstrap());
}

class LMSInstructorBootstrap extends StatelessWidget {
  const LMSInstructorBootstrap({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()..tryAutoLogin()),
        Provider(create: (_) => ApiClient()),
      ],
      child: const _LMSShell(),
    );
  }
}

class _LMSShell extends StatefulWidget {
  const _LMSShell();

  @override
  State<_LMSShell> createState() => _LMSShellState();
}

class _LMSShellState extends State<_LMSShell> {
  AppRouter? _appRouter;
  AuthService? _auth;
  bool _showSplash = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(milliseconds: 2200), () {
      if (mounted) setState(() => _showSplash = false);
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final auth = context.read<AuthService>();
    if (!identical(_auth, auth) || _appRouter == null) {
      _auth = auth;
      _appRouter = AppRouter(auth);
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MOIST LMS Instructor',
      debugShowCheckedModeBanner: false,
      theme: LMSTheme.light,
      routerConfig: _appRouter!.router,
      builder: (context, child) {
        return Stack(
          fit: StackFit.expand,
          children: [
            child ?? const SizedBox.shrink(),
            AnimatedOpacity(
              opacity: _showSplash ? 1.0 : 0.0,
              duration: const Duration(milliseconds: 500),
              curve: Curves.easeInCubic,
              child: IgnorePointer(
                ignoring: !_showSplash,
                child: const _SplashScreen(),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SplashScreen extends StatefulWidget {
  const _SplashScreen();

  @override
  State<_SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<_SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double>  _iconScale;
  late final Animation<double>  _iconFade;
  late final Animation<double>  _glowFade;
  late final Animation<Offset>  _textSlide;
  late final Animation<double>  _textFade;
  late final Animation<double>  _badgeFade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this, duration: const Duration(milliseconds: 1500))..forward();

    _iconScale = Tween<double>(begin: 0.78, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.0, 0.65, curve: Curves.easeOutBack)));
    _iconFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.0, 0.4, curve: Curves.easeOut)));
    _glowFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.3, 0.75, curve: Curves.easeOut)));
    _textSlide = Tween<Offset>(begin: const Offset(0, 0.22), end: Offset.zero)
        .animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.45, 0.9, curve: Curves.easeOutCubic)));
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.42, 0.85, curve: Curves.easeOut)));
    _badgeFade = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(
        parent: _ctrl, curve: const Interval(0.7, 1.0, curve: Curves.easeOut)));
  }

  @override
  void dispose() { _ctrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    // Instructor specific layout
    return Container(
      decoration: const BoxDecoration(gradient: LMSTheme.splashGradient),
      child: Stack(
        children: [
          Positioned(top: -80, right: -80,
            child: AnimatedBuilder(animation: _glowFade,
              builder: (_, __) => Opacity(
                opacity: _glowFade.value * 0.28,
                child: Container(width: 300, height: 300,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: Color(0xFFFFD65A)))))),
          Positioned(bottom: -100, left: -60,
            child: AnimatedBuilder(animation: _glowFade,
              builder: (_, __) => Opacity(
                opacity: _glowFade.value * 0.14,
                child: Container(width: 240, height: 240,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle, color: Color(0xFF10B981)))))),

          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FadeTransition(opacity: _iconFade,
                  child: ScaleTransition(scale: _iconScale,
                    child: Container(
                      width: 128, height: 128,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: Colors.white.withValues(alpha: 0.12),
                        border: Border.all(
                          color: LMSTheme.goldStrong.withValues(alpha: 0.40), width: 2),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 40, spreadRadius: 4, offset: const Offset(0, 16)),
                          BoxShadow(color: LMSTheme.goldStrong.withValues(alpha: 0.15),
                            blurRadius: 32),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Image.asset('assets/images/moist-seal.png',
                          fit: BoxFit.contain,
                          errorBuilder: (_, __, ___) => const Icon(
                            Icons.school_rounded, color: Colors.white, size: 56)),
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 28),
                FadeTransition(opacity: _iconFade,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 5),
                    decoration: BoxDecoration(
                      color: LMSTheme.goldStrong.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(99),
                      border: Border.all(color: LMSTheme.goldStrong.withValues(alpha: 0.40)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.admin_panel_settings_rounded, color: LMSTheme.goldStrong, size: 13),
                        SizedBox(width: 6),
                        Text('LMS INSTRUCTOR',
                          style: TextStyle(color: LMSTheme.goldStrong,
                            fontSize: 9, fontWeight: FontWeight.w800, letterSpacing: 1.4)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SlideTransition(position: _textSlide,
                  child: FadeTransition(opacity: _textFade,
                    child: Column(children: [
                      const Text('MOIST, INC.',
                        style: TextStyle(color: Colors.white,
                          fontSize: 28, fontWeight: FontWeight.w900, letterSpacing: 2.0)),
                      const SizedBox(height: 6),
                      Text('Faculty E-Learning Portal',
                        style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.72),
                          fontSize: 14, fontWeight: FontWeight.w500, letterSpacing: 0.4)),
                    ]),
                  ),
                ),
                const SizedBox(height: 52),
                FadeTransition(opacity: _badgeFade,
                  child: SizedBox(width: 24, height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.white.withValues(alpha: 0.5))))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
