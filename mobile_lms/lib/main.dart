import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

void main() {
  runApp(const LMSBootstrap());
}

class AppConstants {
  static const String baseUrl = 'https://moist-production-7b79.up.railway.app/api/v1';
  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
}

class LMSApp extends StatelessWidget {
  const LMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final router = GoRouter(
      initialLocation: '/login',
      refreshListenable: auth,
      redirect: (context, state) {
        final isLogin = state.matchedLocation == '/login';
        if (!auth.isLoggedIn) return isLogin ? null : '/login';
        if (isLogin) return '/dashboard';
        return null;
      },
      routes: [
        GoRoute(path: '/login', builder: (_, _) => const LoginScreen()),
        GoRoute(path: '/dashboard', builder: (_, _) => const DashboardScreen()),
      ],
    );

    return MaterialApp.router(
      title: 'MOIST LMS',
      debugShowCheckedModeBanner: false,
      routerConfig: router,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7A1324)),
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      ),
    );
  }
}

class LMSBootstrap extends StatelessWidget {
  const LMSBootstrap({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthService()..tryAutoLogin()),
        Provider(create: (_) => ApiClient()),
      ],
      child: const LMSApp(),
    );
  }
}

class AuthService extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _api = ApiClient();

  Map<String, dynamic>? _user;
  bool _loading = false;

  bool get isLoggedIn => _user != null;
  bool get loading => _loading;
  String get role => (_user?['role'] ?? '').toString();
  bool get isInstructor => role == 'teacher' || role == 'admin';
  String get displayName {
    final first = (_user?['firstName'] ?? _user?['first_name'] ?? '').toString();
    final last = (_user?['lastName'] ?? _user?['last_name'] ?? '').toString();
    final full = '$first $last'.trim();
    return full.isEmpty ? role.toUpperCase() : full;
  }

  Future<void> tryAutoLogin() async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token == null) return;
    try {
      final res = await _api.dio.get('/auth/me');
      _user = Map<String, dynamic>.from(res.data as Map);
      notifyListeners();
    } catch (_) {
      await _storage.deleteAll();
    }
  }

  Future<void> login(String studentNumber, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _api.dio.post(
        '/auth/login',
        data: {'studentNumber': studentNumber, 'password': password},
      );
      await _storage.write(
        key: AppConstants.accessTokenKey,
        value: (res.data['accessToken'] ?? '').toString(),
      );
      final refreshToken = (res.data['refreshToken'] ?? '').toString();
      if (refreshToken.isNotEmpty) {
        await _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
      }
      _user = Map<String, dynamic>.from(res.data['user'] as Map);
    } on DioException catch (e) {
      final message = (e.response?.data as Map?)?['error']?.toString() ?? 'Login failed';
      throw Exception(message);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try {
      await _api.dio.post('/auth/logout');
    } catch (_) {}
    await _storage.deleteAll();
    _user = null;
    notifyListeners();
  }
}

class ApiClient {
  ApiClient._internal();
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;

  final _storage = const FlutterSecureStorage();
  late final Dio dio = _buildDio();

  Dio _buildDio() {
    final client = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: const Duration(seconds: 10),
        receiveTimeout: const Duration(seconds: 10),
      ),
    );

    client.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: AppConstants.accessTokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
    return client;
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _studentCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _studentCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthService>();
    setState(() => _error = null);
    try {
      await auth.login(_studentCtrl.text.trim(), _passCtrl.text);
    } catch (e) {
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: Card(
            margin: const EdgeInsets.all(16),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'MOIST LMS',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.w800),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Use your existing student/employee credentials',
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 20),
                    TextFormField(
                      controller: _studentCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Student Number / Employee ID',
                        border: OutlineInputBorder(),
                      ),
                      validator: (value) => value == null || value.trim().isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _passCtrl,
                      obscureText: _obscure,
                      decoration: InputDecoration(
                        labelText: 'Password',
                        border: const OutlineInputBorder(),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => _obscure = !_obscure),
                          icon: Icon(_obscure ? Icons.visibility : Icons.visibility_off),
                        ),
                      ),
                      validator: (value) => value == null || value.isEmpty ? 'Required' : null,
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 10),
                      Text(_error!, style: const TextStyle(color: Colors.red)),
                    ],
                    const SizedBox(height: 12),
                    FilledButton(
                      onPressed: auth.loading ? null : _submit,
                      child: auth.loading
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('Login'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool _loading = true;
  List<dynamic> _courses = [];

  @override
  void initState() {
    super.initState();
    _loadCourses();
  }

  Future<void> _loadCourses() async {
    final api = context.read<ApiClient>();
    try {
      final res = await api.dio.get('/courses');
      final data = res.data;
      if (data is List) {
        _courses = data;
      } else if (data is Map && data['data'] is List) {
        _courses = List<dynamic>.from(data['data'] as List);
      }
    } catch (_) {}
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('LMS Dashboard'),
        actions: [
          IconButton(
            onPressed: () => auth.logout(),
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            'Welcome, ${auth.displayName}',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
          ),
          Text(
            auth.isInstructor ? 'Instructor Mode' : 'Student Mode',
            style: const TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 16),
          Wrap(
            spacing: 10,
            runSpacing: 10,
            children: [
              _featureCard('Course Dashboard', Icons.dashboard),
              _featureCard('Video Lessons', Icons.play_circle),
              _featureCard('Modules (PDF/Slides)', Icons.picture_as_pdf),
              _featureCard('Assignments', Icons.assignment_turned_in),
              _featureCard('Quiz System', Icons.quiz),
              _featureCard('Discussion Forum', Icons.forum),
              _featureCard('Progress Tracking', Icons.insights),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            'Exams',
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 8),
          if (auth.isInstructor) ...[
            _examTile(
              title: 'Create Exam',
              subtitle: 'Title, schedule, timer, attempts, passing score',
              icon: Icons.add_task,
            ),
            _examTile(
              title: 'Question Builder',
              subtitle: 'MCQ, True/False, Identification, Essay',
              icon: Icons.library_add_check,
            ),
            _examTile(
              title: 'Live Exam Session',
              subtitle: 'Start/Stop, force submit, monitor online students',
              icon: Icons.live_tv,
            ),
          ] else ...[
            _examTile(
              title: 'Available Exams',
              subtitle: 'See deadline, time limit, and start exam',
              icon: Icons.fact_check,
            ),
            _examTile(
              title: 'Auto Submit',
              subtitle: 'Submits on timer end or manual submit',
              icon: Icons.timer,
            ),
          ],
          const SizedBox(height: 20),
          Text(
            'Courses from backend',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 8),
          if (_loading)
            const Center(child: CircularProgressIndicator())
          else if (_courses.isEmpty)
            const Text('No courses yet (or endpoint format differs).')
          else
            ..._courses.map((course) => ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.book),
                  title: Text((course['name'] ?? course['course_name'] ?? 'Course').toString()),
                  subtitle: Text(
                    'Updated ${DateFormat('MMM d, y').format(DateTime.now())}',
                  ),
                )),
          const SizedBox(height: 10),
          const Text(
            'Note: LMS feature screens are scaffolded in this MVP. '
            'Backend endpoints for lessons/quizzes/exams/live sessions need to be added next.',
            style: TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _featureCard(String title, IconData icon) {
    return SizedBox(
      width: 165,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon),
              const SizedBox(height: 8),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _examTile({
    required String title,
    required String subtitle,
    required IconData icon,
  }) {
    return Card(
      child: ListTile(
        leading: Icon(icon),
        title: Text(title),
        subtitle: Text(subtitle),
        onTap: () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$title screen is scaffolded in MVP')),
          );
        },
      ),
    );
  }
}
