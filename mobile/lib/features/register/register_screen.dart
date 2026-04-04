import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:dio/dio.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({super.key});
  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _api = ApiClient();

  List<Map<String, dynamic>> _courseObjects = [];
  List<String> get _courses => _courseObjects.map((c) => c['code'] as String).toList();
  List<int> _yearLevels = [];

  final _lastNameCtrl = TextEditingController();
  final _firstNameCtrl = TextEditingController();
  final _middleNameCtrl = TextEditingController();
  final _contactCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  final _confirmCtrl = TextEditingController();

  String? _gender;
  String? _course;
  int? _yearLevel;
  DateTime? _birthdate;

  bool _obscurePassword = true;
  bool _obscureConfirm = true;
  bool _loading = false;
  String? _error;
  String? _studentNumber;

  @override
  void initState() {
    super.initState();
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    try {
      final res = await _api.dio.get('/courses');
      final list = (res.data as List)
          .where((c) => c['is_active'] == 1 || c['is_active'] == true)
          .map<Map<String, dynamic>>((c) => Map<String, dynamic>.from(c as Map))
          .toList();
      if (mounted) setState(() => _courseObjects = list);
    } catch (_) {}
  }

  void _onCourseChanged(String? code) {
    final courseObj = _courseObjects.firstWhere(
      (c) => c['code'] == code,
      orElse: () => {},
    );
    final raw = courseObj['year_levels_offered'];
    List<int> levels;
    if (raw is List) {
      levels = raw.map((e) => (e as num).toInt()).toList()..sort();
    } else if (raw is String) {
      levels = raw.split(',').map((s) => int.tryParse(s.trim())).whereType<int>().toList()..sort();
    } else {
      levels = [1, 2, 3, 4];
    }
    setState(() {
      _course = code;
      _yearLevels = levels;
      _yearLevel = null;
    });
  }

  @override
  void dispose() {
    _lastNameCtrl.dispose();
    _firstNameCtrl.dispose();
    _middleNameCtrl.dispose();
    _contactCtrl.dispose();
    _addressCtrl.dispose();
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    _confirmCtrl.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    if (!_formKey.currentState!.validate()) return;
    if (_passwordCtrl.text != _confirmCtrl.text) {
      setState(() => _error = 'Passwords do not match');
      return;
    }
    setState(() { _error = null; _loading = true; });
    try {
      final res = await _api.dio.post('/auth/register', data: {
        'last_name': _lastNameCtrl.text.trim(),
        'first_name': _firstNameCtrl.text.trim(),
        if (_middleNameCtrl.text.trim().isNotEmpty) 'middle_name': _middleNameCtrl.text.trim(),
        if (_gender != null) 'gender': _gender,
        if (_course != null) 'course': _course,
        if (_yearLevel != null) 'year_level': _yearLevel,
        if (_birthdate != null)
          'birthdate': '${_birthdate!.year.toString().padLeft(4,'0')}-'
              '${_birthdate!.month.toString().padLeft(2,'0')}-'
              '${_birthdate!.day.toString().padLeft(2,'0')}',
        if (_contactCtrl.text.trim().isNotEmpty) 'contact_number': _contactCtrl.text.trim(),
        if (_addressCtrl.text.trim().isNotEmpty) 'address': _addressCtrl.text.trim(),
        if (_emailCtrl.text.trim().isNotEmpty) 'email': _emailCtrl.text.trim(),
        'password': _passwordCtrl.text,
      });
      setState(() => _studentNumber = res.data['studentNumber'] as String);
    } on DioException catch (e) {
      setState(() => _error = (e.response?.data as Map?)?['error'] as String? ?? 'Registration failed. Please try again.');
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _pickBirthdate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(2000),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );
    if (picked != null) setState(() => _birthdate = picked);
  }

  @override
  Widget build(BuildContext context) {
    if (_studentNumber != null) return _buildSuccess();
    return _buildForm();
  }

  Widget _buildSuccess() {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E3A8A), Color(0xFF1E40AF), Color(0xFF1D4ED8)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.check_circle_outline_rounded, size: 56, color: Colors.white),
                  ),
                  const SizedBox(height: 24),
                  const Text('Registration Submitted!',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.white)),
                  const SizedBox(height: 8),
                  Text('Your Student ID has been assigned:',
                    style: TextStyle(fontSize: 14, color: Colors.white.withValues(alpha: 0.75))),
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 36, vertical: 20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(_studentNumber!,
                      style: const TextStyle(
                        fontSize: 40, fontWeight: FontWeight.w900,
                        fontFamily: 'monospace', letterSpacing: 6,
                        color: Color(0xFF1E40AF),
                      )),
                  ),
                  const SizedBox(height: 12),
                  Text('Save this ID — you will use it to sign in once approved.',
                    style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.6))),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade700.withValues(alpha: 0.25),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.amber.shade400.withValues(alpha: 0.5)),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline_rounded, color: Colors.amber.shade200, size: 18),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Your registration is pending approval from the Registrar. You can log in once your account is approved.',
                            style: TextStyle(fontSize: 12, color: Colors.amber.shade100, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: const Color(0xFF1E40AF),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => context.go('/login'),
                      child: const Text('Go to Sign In', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildForm() {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1E3A8A), Color(0xFF1E40AF), Color(0xFF1D4ED8)],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Header
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 20),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                      onPressed: () => context.go('/login'),
                    ),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Student Registration',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
                        Text('Create your student account',
                          style: TextStyle(fontSize: 12, color: Colors.white.withValues(alpha: 0.7))),
                      ],
                    ),
                  ],
                ),
              ),

              // Form card
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    color: Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _sectionLabel('Personal Information'),
                          const SizedBox(height: 12),
                          _field(_lastNameCtrl, 'Last Name', required: true),
                          const SizedBox(height: 12),
                          _field(_firstNameCtrl, 'First Name', required: true),
                          const SizedBox(height: 12),
                          _field(_middleNameCtrl, 'Middle Name (optional)'),
                          const SizedBox(height: 12),
                          _dropdownField<String>(
                            label: 'Gender',
                            value: _gender,
                            items: const ['male', 'female', 'other'],
                            itemLabel: (v) => v[0].toUpperCase() + v.substring(1),
                            onChanged: (v) => setState(() => _gender = v),
                          ),
                          const SizedBox(height: 12),
                          _birthdatePicker(),
                          const SizedBox(height: 12),
                          _field(_contactCtrl, 'Contact Number', keyboardType: TextInputType.phone),
                          const SizedBox(height: 12),
                          _field(_addressCtrl, 'Address'),

                          const SizedBox(height: 20),
                          _sectionLabel('Academic Information'),
                          const SizedBox(height: 12),
                          _dropdownField<String>(
                            label: 'Course',
                            value: _course,
                            items: _courses,
                            itemLabel: (v) => v,
                            onChanged: (v) => _onCourseChanged(v),
                            required: true,
                          ),
                          const SizedBox(height: 12),
                          _dropdownField<int>(
                            key: ValueKey(_course),
                            label: 'Year Level',
                            value: _yearLevel,
                            items: _yearLevels,
                            itemLabel: (v) => 'Year $v',
                            onChanged: (v) => setState(() => _yearLevel = v),
                            required: true,
                          ),

                          const SizedBox(height: 20),
                          _sectionLabel('Account Information'),
                          const SizedBox(height: 4),
                          Text('Email is optional — used only for password reset.',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                          const SizedBox(height: 12),
                          _field(_emailCtrl, 'Email (optional)',
                            keyboardType: TextInputType.emailAddress),
                          const SizedBox(height: 12),
                          _passwordField(_passwordCtrl, 'Password', _obscurePassword,
                            () => setState(() => _obscurePassword = !_obscurePassword),
                            required: true),
                          const SizedBox(height: 12),
                          _passwordField(_confirmCtrl, 'Confirm Password', _obscureConfirm,
                            () => setState(() => _obscureConfirm = !_obscureConfirm),
                            required: true),

                          if (_error != null) ...[
                            const SizedBox(height: 16),
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
                          ],

                          const SizedBox(height: 24),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _loading ? null : _register,
                              child: _loading
                                ? const SizedBox(height: 20, width: 20,
                                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                                : const Text('Register'),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Center(
                            child: TextButton(
                              onPressed: () => context.go('/login'),
                              style: TextButton.styleFrom(foregroundColor: Colors.grey.shade600),
                              child: const Text('Already have an account? Sign In', style: TextStyle(fontSize: 13)),
                            ),
                          ),
                          const SizedBox(height: 8),
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
    );
  }

  Widget _sectionLabel(String label) => Text(label,
    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
      color: Color(0xFF1E293B), letterSpacing: 0.3));

  Widget _field(TextEditingController ctrl, String label, {
    bool required = false,
    TextInputType keyboardType = TextInputType.text,
  }) {
    return TextFormField(
      controller: ctrl,
      keyboardType: keyboardType,
      decoration: InputDecoration(labelText: required ? '$label *' : label),
      validator: required ? (v) => (v == null || v.trim().isEmpty) ? '$label is required' : null : null,
    );
  }

  Widget _passwordField(TextEditingController ctrl, String label, bool obscure,
      VoidCallback toggleObscure, {bool required = false}) {
    return TextFormField(
      controller: ctrl,
      obscureText: obscure,
      decoration: InputDecoration(
        labelText: required ? '$label *' : label,
        suffixIcon: IconButton(
          icon: Icon(obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 20),
          onPressed: toggleObscure,
        ),
      ),
      validator: required
        ? (v) {
            if (v == null || v.isEmpty) return '$label is required';
            if (ctrl == _passwordCtrl && v.length < 8) return 'Password must be at least 8 characters';
            return null;
          }
        : null,
    );
  }

  Widget _dropdownField<T>({
    Key? key,
    required String label,
    required T? value,
    required List<T> items,
    required String Function(T) itemLabel,
    required ValueChanged<T?> onChanged,
    bool required = false,
  }) {
    return DropdownButtonFormField<T>(
      key: key,
      initialValue: value,
      decoration: InputDecoration(labelText: required ? '$label *' : label),
      items: items.isEmpty ? null : items.map((e) => DropdownMenuItem(value: e, child: Text(itemLabel(e)))).toList(),
      onChanged: items.isEmpty ? null : onChanged,
      validator: required ? (v) => v == null ? 'Please select a $label' : null : null,
    );
  }

  Widget _birthdatePicker() {
    return GestureDetector(
      onTap: _pickBirthdate,
      child: AbsorbPointer(
        child: TextFormField(
          decoration: const InputDecoration(
            labelText: 'Birthdate',
            suffixIcon: Icon(Icons.calendar_today_outlined, size: 18),
          ),
          controller: TextEditingController(
            text: _birthdate == null
              ? ''
              : '${_birthdate!.year}-${_birthdate!.month.toString().padLeft(2,'0')}-${_birthdate!.day.toString().padLeft(2,'0')}',
          ),
        ),
      ),
    );
  }
}
