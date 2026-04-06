import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../constants.dart';

class AuthService extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _api     = ApiClient();

  Map<String, dynamic>? _user;
  bool _loading = false;

  bool   get isLoggedIn   => _user != null;
  bool   get loading      => _loading;
  Map<String, dynamic>? get user => _user;
  String get role         => (_user?['role'] ?? '').toString();
  bool   get isStudent    => role == 'student';
  bool   get isInstructor => role == 'teacher' || role == 'admin';

  String get displayName {
    final first = (_user?['firstName'] ?? _user?['first_name'] ?? '').toString();
    final last  = (_user?['lastName']  ?? _user?['last_name']  ?? '').toString();
    final full  = '$first $last'.trim();
    return full.isEmpty ? role.toUpperCase() : full;
  }

  String? get studentNumber => (_user?['studentNumber'] ?? _user?['student_number'])?.toString();
  String? get course => (_user?['course'])?.toString();
  int? get yearLevel {
    final raw = _user?['year_level'] ?? _user?['yearLevel'];
    if (raw == null) return null;
    if (raw is num) return raw.toInt();
    return int.tryParse(raw.toString());
  }

  Future<void> tryAutoLogin() async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token == null) return;
    try {
      final res = await _api.dio.get('/auth/me');
      final data = Map<String, dynamic>.from(res.data as Map);
      // Student app: only allow students
      if (_isStudentRole(data)) {
        _user = data;
      } else {
        await _storage.deleteAll();
      }
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
      final userData = Map<String, dynamic>.from(res.data['user'] as Map);

      // Student app: reject non-student roles
      if (!_isStudentRole(userData)) {
        throw Exception(
          'This app is for students only. Instructors should use the MOIST LMS Instructor app.');
      }

      await _storage.write(
        key: AppConstants.accessTokenKey,
        value: (res.data['accessToken'] ?? '').toString(),
      );
      final refresh = (res.data['refreshToken'] ?? '').toString();
      if (refresh.isNotEmpty) {
        await _storage.write(key: AppConstants.refreshTokenKey, value: refresh);
      }
      _user = userData;

      // Load full profile (course/year_level/etc) after login
      try {
        final meRes = await _api.dio.get('/auth/me');
        final me = Map<String, dynamic>.from(meRes.data as Map);
        if (_isStudentRole(me)) {
          _user = me;
        }
      } catch (_) {}
    } on DioException catch (e) {
      final msg = (e.response?.data as Map?)?['error']?.toString() ?? 'Login failed';
      throw Exception(msg);
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    try { await _api.dio.post('/auth/logout'); } catch (_) {}
    await _storage.deleteAll();
    _user = null;
    notifyListeners();
  }

  bool _isStudentRole(Map<String, dynamic> data) {
    final r = (data['role'] ?? '').toString().toLowerCase();
    return r == 'student';
  }
}
