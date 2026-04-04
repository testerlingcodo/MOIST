class AppConstants {
  // Update this depending on how you run the app.
  // Android emulator: use 10.0.2.2
  // Physical Android: use your PC's current IPv4 address
  // iOS simulator: use localhost
  static const String _host = '192.168.1.37';
  static const int _port = 5000;

  static const String baseUrl = 'http://$_host:$_port/api/v1';

  static const String accessTokenKey = 'access_token';
  static const String refreshTokenKey = 'refresh_token';
}
