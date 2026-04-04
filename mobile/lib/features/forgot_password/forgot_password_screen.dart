import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

enum _Step { email, otp, newPassword, done }

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({super.key});
  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  _Step _step = _Step.email;
  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();
  bool _loading = false;
  bool _obscure = true;
  String? _error;
  String? _resetToken; // issued by server after OTP is verified

  // Resend cooldown
  int _cooldown = 0;
  Timer? _cooldownTimer;

  @override
  void dispose() {
    _cooldownTimer?.cancel();
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    _passCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  void _startCooldown() {
    setState(() => _cooldown = 60);
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() {
        if (_cooldown <= 1) { _cooldown = 0; t.cancel(); }
        else { _cooldown--; }
      });
    });
  }

  Future<void> _sendOtp() async {
    if (_emailCtrl.text.trim().isEmpty) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiClient().dio.post('/auth/forgot-password',
        data: {'email': _emailCtrl.text.trim()});
      _resetToken = null;
      _otpCtrl.clear();
      _startCooldown();
      setState(() => _step = _Step.otp);
    } on DioException catch (e) {
      setState(() => _error = e.response?.data['error'] ?? 'Something went wrong');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _resendOtp() async {
    if (_cooldown > 0) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ApiClient().dio.post('/auth/forgot-password',
        data: {'email': _emailCtrl.text.trim()});
      _resetToken = null;
      _startCooldown();
      _otpCtrl.clear();
    } on DioException catch (e) {
      setState(() => _error = e.response?.data['error'] ?? 'Failed to resend OTP');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    if (_otpCtrl.text.length != 6) {
      setState(() => _error = 'Enter the 6-digit OTP');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient().dio.post('/auth/verify-otp', data: {
        'email': _emailCtrl.text.trim(),
        'otp': _otpCtrl.text,
      });
      _resetToken = res.data['resetToken'] as String?;
      setState(() => _step = _Step.newPassword);
    } on DioException catch (e) {
      setState(() => _error = e.response?.data['error'] ?? 'Invalid or expired OTP');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _resetPassword() async {
    if (_passCtrl.text.length < 8) {
      setState(() => _error = 'Password must be at least 8 characters');
      return;
    }
    if (_passCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() { _loading = true; _error = null; });
    try {
      await ApiClient().dio.post('/auth/reset-password', data: {
        'email': _emailCtrl.text.trim(),
        'resetToken': _resetToken,
        'newPassword': _passCtrl.text,
      });
      setState(() => _step = _Step.done);
    } on DioException catch (e) {
      setState(() => _error = e.response?.data['error'] ?? 'Reset failed. Try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Reset Password'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Progress indicator
              Row(children: List.generate(3, (i) => Expanded(
                child: Container(
                  height: 4,
                  margin: EdgeInsets.only(right: i < 2 ? 6 : 0),
                  decoration: BoxDecoration(
                    color: _step.index > i ? AppTheme.primary : Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ))),
              const SizedBox(height: 32),

              if (_step == _Step.email) _buildEmailStep(),
              if (_step == _Step.otp) _buildOtpStep(),
              if (_step == _Step.newPassword) _buildNewPasswordStep(),
              if (_step == _Step.done) _buildDoneStep(),

              if (_error != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.danger.withValues(alpha: 0.08),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(children: [
                    const Icon(Icons.error_outline, color: AppTheme.danger, size: 18),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: AppTheme.danger, fontSize: 13))),
                  ]),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmailStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Icon(Icons.email_outlined, size: 48, color: AppTheme.primary),
      const SizedBox(height: 16),
      const Text('Forgot Password?', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Text("Enter your email address and we'll send you a reset code.",
        style: TextStyle(color: Colors.grey.shade600, height: 1.5)),
      const SizedBox(height: 28),
      TextFormField(
        controller: _emailCtrl,
        keyboardType: TextInputType.emailAddress,
        decoration: const InputDecoration(
          labelText: 'Email Address',
          prefixIcon: Icon(Icons.email_outlined, size: 20),
        ),
      ),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: _loading ? null : _sendOtp,
          child: _loading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('Send OTP'),
        )),
    ],
  );

  Widget _buildOtpStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Icon(Icons.sms_outlined, size: 48, color: AppTheme.primary),
      const SizedBox(height: 16),
      const Text('Enter OTP', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Text('Enter the 6-digit code sent to ${_emailCtrl.text}',
        style: TextStyle(color: Colors.grey.shade600, height: 1.5)),
      const SizedBox(height: 28),
      TextFormField(
        controller: _otpCtrl,
        keyboardType: TextInputType.number,
        maxLength: 6,
        textAlign: TextAlign.center,
        style: const TextStyle(fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: 12),
        decoration: const InputDecoration(
          hintText: '000000',
          counterText: '',
        ),
      ),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: (_loading || _otpCtrl.text.length != 6) ? null : _verifyOtp,
          child: _loading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('Verify OTP'),
        )),
      const SizedBox(height: 16),
      Center(
        child: _cooldown > 0
          ? Text('Resend OTP in ${_cooldown}s',
              style: TextStyle(color: Colors.grey.shade500, fontSize: 13))
          : TextButton(
              onPressed: _loading ? null : _resendOtp,
              child: const Text('Resend OTP'),
            ),
      ),
    ],
  );

  Widget _buildNewPasswordStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const Icon(Icons.lock_reset_outlined, size: 48, color: AppTheme.primary),
      const SizedBox(height: 16),
      const Text('New Password', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700)),
      const SizedBox(height: 8),
      Text('Create a strong new password for your account.',
        style: TextStyle(color: Colors.grey.shade600, height: 1.5)),
      const SizedBox(height: 28),
      TextFormField(
        controller: _passCtrl,
        obscureText: _obscure,
        decoration: InputDecoration(
          labelText: 'New Password',
          prefixIcon: const Icon(Icons.lock_outlined, size: 20),
          suffixIcon: IconButton(
            icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
            onPressed: () => setState(() => _obscure = !_obscure),
          ),
        ),
      ),
      const SizedBox(height: 16),
      TextFormField(
        controller: _confirmCtrl,
        obscureText: true,
        decoration: const InputDecoration(
          labelText: 'Confirm Password',
          prefixIcon: Icon(Icons.lock_outlined, size: 20),
        ),
      ),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: _loading ? null : _resetPassword,
          child: _loading
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
            : const Text('Reset Password'),
        )),
    ],
  );

  Widget _buildDoneStep() => Column(
    crossAxisAlignment: CrossAxisAlignment.center,
    children: [
      const SizedBox(height: 24),
      Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: AppTheme.success.withValues(alpha: 0.1),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check_circle_rounded, color: AppTheme.success, size: 64),
      ),
      const SizedBox(height: 24),
      const Text('Password Reset!', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w700),
        textAlign: TextAlign.center),
      const SizedBox(height: 8),
      Text('Your password has been successfully reset.\nYou can now sign in with your new password.',
        style: TextStyle(color: Colors.grey.shade600, height: 1.6),
        textAlign: TextAlign.center),
      const SizedBox(height: 32),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: () => context.go('/login'),
          child: const Text('Back to Sign In'),
        )),
    ],
  );
}
