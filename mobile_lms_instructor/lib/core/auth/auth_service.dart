import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../api/api_client.dart';
import '../constants.dart';

class AuthService extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _api     = ApiClient();

  Map<String, dynamic>? _user;
  Map<String, dynamic>? _teacherProfile;
  bool _loading = false;

  bool   get isLoggedIn   => _user != null;
  bool   get loading      => _loading;
  Map<String, dynamic>? get user => _user;
  String get role         => (_user?['role'] ?? '').toString();
  bool   get isStudent    => role == 'student';
  bool   get isInstructor => role == 'teacher' || role == 'admin';

  String get displayName {
    final teacherFirst = (_teacherProfile?['first_name'] ?? '').toString();
    final teacherLast = (_teacherProfile?['last_name'] ?? '').toString();
    final teacherFull = '$teacherFirst $teacherLast'.trim();
    if (teacherFull.isNotEmpty) return teacherFull;

    final first = (_user?['firstName'] ?? _user?['first_name'] ?? '').toString();
    final last  = (_user?['lastName']  ?? _user?['last_name']  ?? '').toString();
    final full  = '$first $last'.trim();
    if (full.isNotEmpty) return full;

    final email = (_user?['email'] ?? '').toString();
    if (email.contains('@')) return email.split('@').first;
    return role.toUpperCase();
  }

  String? get studentNumber => (_user?['studentNumber'] ?? _user?['student_number'])?.toString();

  Future<void> tryAutoLogin() async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token == null) return;
    try {
      final res = await _api.dio.get('/auth/me');
      final data = Map<String, dynamic>.from(res.data as Map);
      // Instructor app: only allow teachers/admins
      if (_isInstructorRole(data)) {
        _user = data;
        await _loadInstructorProfile();
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

      // Instructor app: reject student roles
      if (_isInstructorRole(userData)) {
        await _storage.write(
          key: AppConstants.accessTokenKey,
          value: (res.data['accessToken'] ?? '').toString(),
        );
        final refresh = (res.data['refreshToken'] ?? '').toString();
        if (refresh.isNotEmpty) {
          await _storage.write(key: AppConstants.refreshTokenKey, value: refresh);
        }
        _user = userData;
        await _loadInstructorProfile();
      } else {
        throw Exception('This app is for instructors only. Students should use the MOIST LMS app.');
      }
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
    _teacherProfile = null;
    notifyListeners();
  }

  Future<void> _loadInstructorProfile() async {
    try {
      final res = await _api.dio.get('/teachers/me');
      _teacherProfile = Map<String, dynamic>.from(res.data as Map);
    } catch (_) {
      _teacherProfile = null;
    }
  }

  bool _isInstructorRole(Map<String, dynamic> data) {
    final r = (data['role'] ?? '').toString().toLowerCase();
    return r == 'teacher' || r == 'admin';
  }
}
