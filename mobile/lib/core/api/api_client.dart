import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../constants/app_constants.dart';

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final _storage = const FlutterSecureStorage();
  late final Dio dio = _buildDio();

  Dio _buildDio() {
    final d = Dio(BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    d.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: AppConstants.accessTokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          try {
            final refreshToken = await _storage.read(key: AppConstants.refreshTokenKey);
            if (refreshToken == null) {
              handler.next(error);
              return;
            }
            final res = await Dio().post(
              '${AppConstants.baseUrl}/auth/refresh',
              data: {'refreshToken': refreshToken},
            );
            final newToken = res.data['accessToken'] as String;
            await _storage.write(key: AppConstants.accessTokenKey, value: newToken);

            // Retry original request
            final opts = error.requestOptions;
            opts.headers['Authorization'] = 'Bearer $newToken';
            final retryRes = await d.fetch(opts);
            handler.resolve(retryRes);
            return;
          } catch (_) {
            await _storage.deleteAll();
          }
        }
        handler.next(error);
      },
    ));

    return d;
  }
}
