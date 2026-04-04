import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'core/auth/auth_service.dart';
import 'core/theme/app_theme.dart';
import 'core/update/update_checker.dart';
import 'features/notifications/student_notification_center.dart';
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
  runApp(const SISPortalApp());
}

class SISPortalApp extends StatelessWidget {
  const SISPortalApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(
          create: (_) => AuthService()..tryAutoLogin(),
        ),
        ChangeNotifierProxyProvider<AuthService, StudentNotificationCenter>(
          create: (_) => StudentNotificationCenter(),
          update: (_, auth, center) =>
              (center ?? StudentNotificationCenter())..bindAuth(auth),
        ),
      ],
      child: const _AppShell(),
    );
  }
}

class _AppShell extends StatefulWidget {
  const _AppShell();

  @override
  State<_AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<_AppShell> {
  AppRouter? _appRouter;
  AuthService? _auth;
  Timer? _introTimer;
  bool _showIntro = true;

  @override
  void initState() {
    super.initState();
    _introTimer = Timer(const Duration(milliseconds: 2000), () {
      if (!mounted) return;
      setState(() => _showIntro = false);
      // Check for updates after splash screen
      UpdateChecker.check(context);
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
  void dispose() {
    _introTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'MOIST SIS',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      routerConfig: _appRouter!.router,
      builder: (context, child) {
        return Stack(
          fit: StackFit.expand,
          children: [
            child ?? const SizedBox.shrink(),
            AnimatedOpacity(
              opacity: _showIntro ? 1 : 0,
              duration: const Duration(milliseconds: 480),
              curve: Curves.easeInCubic,
              child: IgnorePointer(
                ignoring: !_showIntro,
                child: const _LaunchIntro(),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _LaunchIntro extends StatefulWidget {
  const _LaunchIntro();

  @override
  State<_LaunchIntro> createState() => _LaunchIntroState();
}

class _LaunchIntroState extends State<_LaunchIntro>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;
  late final Animation<double> _iconScale;
  late final Animation<double> _iconFade;
  late final Animation<double> _glowFade;
  late final Animation<Offset> _textSlide;
  late final Animation<double> _textFade;
  late final Animation<double> _badgeFade;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..forward();

    _iconScale = Tween<double>(begin: 0.78, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.0, 0.65, curve: Curves.easeOutBack),
      ),
    );
    _iconFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.0, 0.4, curve: Curves.easeOut),
      ),
    );
    _glowFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.3, 0.75, curve: Curves.easeOut),
      ),
    );
    _textSlide = Tween<Offset>(
      begin: const Offset(0, 0.22),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _ctrl,
      curve: const Interval(0.45, 0.9, curve: Curves.easeOutCubic),
    ));
    _textFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.42, 0.85, curve: Curves.easeOut),
      ),
    );
    _badgeFade = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _ctrl,
        curve: const Interval(0.7, 1.0, curve: Curves.easeOut),
      ),
    );
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Color(0xFF3B0610),
            Color(0xFF6B1020),
            Color(0xFF8B1A2E),
          ],
        ),
      ),
      child: Stack(
        children: [
          // Background glow orb
          Positioned(
            top: -80,
            right: -80,
            child: AnimatedBuilder(
              animation: _glowFade,
              builder: (_, __) => Opacity(
                opacity: _glowFade.value * 0.3,
                child: Container(
                  width: 280,
                  height: 280,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFFFFD65A),
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            bottom: -100,
            left: -60,
            child: AnimatedBuilder(
              animation: _glowFade,
              builder: (_, __) => Opacity(
                opacity: _glowFade.value * 0.15,
                child: Container(
                  width: 220,
                  height: 220,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: Color(0xFF2563EB),
                  ),
                ),
              ),
            ),
          ),

          // Content
          Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // App icon
                FadeTransition(
                  opacity: _iconFade,
                  child: ScaleTransition(
                    scale: _iconScale,
                    child: Container(
                      width: 128,
                      height: 128,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(30),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.3),
                            blurRadius: 40,
                            spreadRadius: 4,
                            offset: const Offset(0, 16),
                          ),
                          BoxShadow(
                            color: const Color(0xFFFFD65A).withValues(alpha: 0.15),
                            blurRadius: 32,
                            offset: const Offset(0, 0),
                          ),
                        ],
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(30),
                        child: Image.asset(
                          'assets/images/apk-icon-zoom.png',
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFF5E0D1A), Color(0xFF7A1324)],
                              ),
                            ),
                            child: const Center(
                              child: Icon(Icons.school_rounded, color: Colors.white, size: 56),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 28),

                // Title + subtitle
                SlideTransition(
                  position: _textSlide,
                  child: FadeTransition(
                    opacity: _textFade,
                    child: Column(
                      children: [
                        const Text(
                          'MOIST, INC.',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 28,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2.0,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Student Information Portal',
                          style: TextStyle(
                            color: Colors.white.withValues(alpha: 0.72),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 48),

                // Loading indicator
                FadeTransition(
                  opacity: _badgeFade,
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        Colors.white.withValues(alpha: 0.5),
                      ),
                    ),
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
