import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:dio/dio.dart';
import '../api/api_client.dart';
import '../constants/app_constants.dart';

class AuthService extends ChangeNotifier {
  final _storage = const FlutterSecureStorage();
  final _api = ApiClient();

  Map<String, dynamic>? _user;
  bool _loading = false;

  Map<String, dynamic> _normalizeUser(Map data) {
    final map = Map<String, dynamic>.from(data);
    return {
      ...map,
      'studentId': map['studentId'] ?? map['student_id'],
    };
  }

  Map<String, dynamic>? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get loading => _loading;
  String? get studentId => (_user?['studentId'] ?? _user?['student_id']) as String?;
  String? get role => _user?['role'] as String?;
  bool get isAdmin => role == 'admin';
  bool get isStaff => role == 'staff';
  bool get isTeacher => role == 'teacher';
  bool get isDean => role == 'dean';
  bool get isRegistrar => role == 'registrar';
  bool get isCashier => role == 'cashier';
  bool get isStudent => role == 'student';

  Future<void> tryAutoLogin() async {
    final token = await _storage.read(key: AppConstants.accessTokenKey);
    if (token == null) return;
    try {
      final res = await _api.dio.get('/auth/me');
      _user = _normalizeUser(res.data as Map);
      notifyListeners();
    } catch (_) {
      await _storage.deleteAll();
    }
  }

  Future<void> login(String studentNumber, String password) async {
    _loading = true;
    notifyListeners();
    try {
      final res = await _api.dio.post('/auth/login', data: {
        'studentNumber': studentNumber,
        'password': password,
      });
      final accessToken = res.data['accessToken'] as String;
      final refreshToken = res.data['refreshToken'] as String?;
      await _storage.write(key: AppConstants.accessTokenKey, value: accessToken);
      if (refreshToken != null) {
        await _storage.write(key: AppConstants.refreshTokenKey, value: refreshToken);
      }
      _user = _normalizeUser(res.data['user'] as Map);
    } on DioException catch (e) {
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.type == DioExceptionType.connectionError) {
        throw Exception('Cannot connect to the server. Make sure your phone and PC are on the same Wi-Fi and the backend is running at ${AppConstants.baseUrl}.');
      }
      final serverError = (e.response?.data as Map?)?['error'] as String?;
      throw Exception(serverError ?? 'Login failed');
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
}
