import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _studentNumberCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  String? _error;
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 800));
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeOut);
    _animCtrl.forward();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    _studentNumberCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthService>();
    if (!mounted) return;
    setState(() => _error = null);
    try {
      await auth.login(_studentNumberCtrl.text.trim(), _passCtrl.text);
    } catch (e) {
      if (!mounted) return;
      final msg = e is Exception ? e.toString().replaceFirst('Exception: ', '') : '';
      setState(() => _error = msg.isNotEmpty ? msg : 'Invalid Student ID or password. Please try again.');
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF5a0d1a), Color(0xFF7a1324), Color(0xFFa01830)],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnim,
            child: Column(
              children: [
                // Header
                Expanded(
                  flex: 2,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset(
                        'assets/images/moist-seal.png',
                        width: 100,
                        height: 100,
                        errorBuilder: (_, __, ___) => Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.15),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.school_rounded, size: 52, color: Colors.white),
                        ),
                      ),
                      const SizedBox(height: 16),
                      const Text('MOIST, INC.',
                        style: TextStyle(fontSize: 26, fontWeight: FontWeight.w900,
                          color: Colors.white, letterSpacing: 1.5)),
                      const SizedBox(height: 4),
                      Text('Student Information Portal',
                        style: TextStyle(fontSize: 13, color: Colors.white.withValues(alpha: 0.80),
                          letterSpacing: 0.5)),
                    ],
                  ),
                ),

                // Form card
                Expanded(
                  flex: 3,
                  child: Container(
                    width: double.infinity,
                    decoration: const BoxDecoration(
                      color: Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
                    ),
                    padding: const EdgeInsets.all(28),
                    child: SingleChildScrollView(
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Welcome back',
                              style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700,
                                color: Color(0xFF1E293B))),
                            const SizedBox(height: 4),
                            Text('Sign in to your account',
                              style: TextStyle(fontSize: 14, color: Colors.grey.shade500)),
                            const SizedBox(height: 28),

                            // Student ID
                            TextFormField(
                              controller: _studentNumberCtrl,
                              keyboardType: TextInputType.text,
                              textInputAction: TextInputAction.next,
                              decoration: const InputDecoration(
                                labelText: 'Student ID',
                                prefixIcon: Icon(Icons.badge_outlined, size: 20),
                              ),
                              validator: (v) => (v == null || v.trim().isEmpty) ? 'Student ID is required' : null,
                            ),
                            const SizedBox(height: 16),

                            // Password
                            TextFormField(
                              controller: _passCtrl,
                              obscureText: _obscure,
                              textInputAction: TextInputAction.done,
                              onFieldSubmitted: (_) => _login(),
                              decoration: InputDecoration(
                                labelText: 'Password',
                                prefixIcon: const Icon(Icons.lock_outlined, size: 20),
                                suffixIcon: IconButton(
                                  icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
                                  onPressed: () => setState(() => _obscure = !_obscure),
                                ),
                              ),
                              validator: (v) => (v == null || v.isEmpty) ? 'Password is required' : null,
                            ),

                            // Forgot password
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => context.push('/forgot-password'),
                                style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
                                child: const Text('Forgot Password?', style: TextStyle(fontSize: 13)),
                              ),
                            ),

                            if (_error != null) ...[
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                decoration: BoxDecoration(
                                  color: AppTheme.danger.withValues(alpha: 0.08),
                                  borderRadius: BorderRadius.circular(10),
                                  border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
                                ),
                                child: Row(children: [
                                  const Icon(Icons.error_outline, color: AppTheme.danger, size: 18),
                                  const SizedBox(width: 8),
                                  Expanded(child: Text(_error!,
                                    style: const TextStyle(color: AppTheme.danger, fontSize: 13))),
                                ]),
                              ),
                              const SizedBox(height: 16),
                            ],

                            const SizedBox(height: 8),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: auth.loading ? null : _login,
                                child: auth.loading
                                  ? const SizedBox(height: 20, width: 20,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                  : const Text('Sign In'),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Center(
                              child: TextButton(
                                onPressed: () => context.push('/register'),
                                style: TextButton.styleFrom(foregroundColor: AppTheme.primary),
                                child: const Text('New student? Register here', style: TextStyle(fontSize: 13)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
