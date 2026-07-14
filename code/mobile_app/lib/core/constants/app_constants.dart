class AppConstants {
  
  AppConstants._();

  /// Allows overriding the default API base URL at compile time using --dart-define.
  /// ex: flutter run --dart-define=API_BASE_URL=https://production.com/api
  static const String defaultApiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    // defaultValue: 'http://172.20.10.7:3001/api',
    // defaultValue: 'http://10.30.7.70:3001/api'
    // defaultValue: 'http://10.30.15.37:3001/api'
    defaultValue: 'http://10.74.164.68:3001/api',
    // defaultValue: 'https://smart-locker-backup-api-freycmg3g0b2dbcv.eastasia-01.azurewebsites.net/api',
    // defaultValue: 'https://172nafpslj.execute-api.ap-south-1.amazonaws.com/api'
  );
}