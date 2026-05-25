class AppConstants {
  
  AppConstants._();

  /// Allows overriding the default API base URL at compile time using --dart-define.
  /// ex: flutter run --dart-define=API_BASE_URL=https://production.com/api
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // defaultValue: 'http://10.187.55.68:5001',
    defaultValue: 'https://smart-locker-api-e2akdzc2axd2feg7.eastasia-01.azurewebsites.net',
  );
}