import 'dart:convert';
import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:local_auth/local_auth.dart';

import '../../core/errors/api_error.dart';
import '../../data/models/auth_result.dart';
import '../../data/models/user_profile.dart';
import 'crypto_service.dart';

class TrustedIdentity {
  const TrustedIdentity({
    required this.userId,
    required this.userName,
    required this.privateKey,
    required this.isBiometricEnabled,
  });

  final String userId;
  final String userName;
  final String privateKey;
  final bool isBiometricEnabled;

  bool get hasTrustedDeviceData =>
      userId.isNotEmpty && userName.isNotEmpty && privateKey.isNotEmpty;
}

class DeviceIdentity {
  const DeviceIdentity({
    required this.keyId,
    required this.publicKey,
    required this.privateKey,
    required this.isInitialized,
  });

  final String keyId;
  final String publicKey;
  final String privateKey;
  final bool isInitialized;

  bool get hasDeviceData =>
      keyId.isNotEmpty && publicKey.isNotEmpty && privateKey.isNotEmpty;
}

class AccountChallenge {
  const AccountChallenge({
    required this.transactionId,
    required this.userId,
    required this.userName,
  });

  final String transactionId;
  final String userId;
  final String userName;
}

class AuthService {
  AuthService({
    required this.baseUrl,
    FlutterSecureStorage? secureStorage,
    LocalAuthentication? localAuthentication,
    CryptoService? cryptoService,
    http.Client? httpClient,
  }) : _secureStorage = secureStorage ?? const FlutterSecureStorage(),
       _localAuth = localAuthentication ?? LocalAuthentication(),
       _cryptoService = cryptoService ?? const CryptoService(),
       _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final FlutterSecureStorage _secureStorage;
  final LocalAuthentication _localAuth;
  final CryptoService _cryptoService;
  final http.Client _httpClient;

  static const _kUserName = 'userName';
  static const _kUserId = 'userId';
  static const _kBiometricEnabled = 'isBiometricEnabled';
  static const _kPrivateKey = 'privateKey';
  static const _kDeviceKeyId = 'deviceKeyId';
  static const _kDevicePublicKey = 'devicePublicKey';
  static const _kDevicePrivateKey = 'devicePrivateKey';
  static const _kDeviceInitialized = 'deviceInitialized';

  Future<TrustedIdentity> loadTrustedIdentity() async {
    final values = await _secureStorage.readAll();
    return TrustedIdentity(
      userId: values[_kUserId] ?? '',
      userName: values[_kUserName] ?? '',
      privateKey: values[_kPrivateKey] ?? '',
      isBiometricEnabled: (values[_kBiometricEnabled] ?? 'false') == 'true',
    );
  }

  Future<void> saveTrustedIdentity({
    required String userId,
    required String userName,
    required String privateKey,
  }) async {
    await _secureStorage.write(key: _kUserId, value: userId);
    await _secureStorage.write(key: _kUserName, value: userName);
    await _secureStorage.write(key: _kPrivateKey, value: privateKey);
  }

  Future<void> setBiometricEnabled(bool value) async {
    await _secureStorage.write(key: _kBiometricEnabled, value: value.toString());
  }

  Future<DeviceIdentity> loadOrCreateDeviceIdentity() async {
    final values = await _secureStorage.readAll();
    final keyId = values[_kDeviceKeyId] ?? '';
    final publicKey = values[_kDevicePublicKey] ?? '';
    final privateKey = values[_kDevicePrivateKey] ?? '';
    final initialized = (values[_kDeviceInitialized] ?? 'false') == 'true';

    if (keyId.isNotEmpty && publicKey.isNotEmpty && privateKey.isNotEmpty) {
      return DeviceIdentity(
        keyId: keyId,
        publicKey: publicKey,
        privateKey: privateKey,
        isInitialized: initialized,
      );
    }

    final deviceKeyPair = await _cryptoService.generateRsaKeyPair();
    final generatedKeyId = _generateDeviceKeyId();

    await _secureStorage.write(key: _kDeviceKeyId, value: generatedKeyId);
    await _secureStorage.write(key: _kDevicePublicKey, value: deviceKeyPair.publicKeyJwk);
    await _secureStorage.write(key: _kDevicePrivateKey, value: deviceKeyPair.privateKeyJwk);
    await _secureStorage.write(key: _kDeviceInitialized, value: 'false');

    return DeviceIdentity(
      keyId: generatedKeyId,
      publicKey: deviceKeyPair.publicKeyJwk,
      privateKey: deviceKeyPair.privateKeyJwk,
      isInitialized: false,
    );
  }

  Future<void> setDeviceInitialized(bool value) async {
    await _secureStorage.write(key: _kDeviceInitialized, value: value.toString());
  }

  Future<bool> isBiometricEnabled() async {
    final value = await _secureStorage.read(key: _kBiometricEnabled);
    return value == 'true';
  }

  String _generateDeviceKeyId() {
    final bytes = List<int>.generate(16, (_) => Random.secure().nextInt(256));
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  Future<bool> promptForBiometric() async {
    final canCheck = await _localAuth.canCheckBiometrics;
    final supported = await _localAuth.isDeviceSupported();
    if (!canCheck || !supported) {
      return false;
    }

    return _localAuth.authenticate(
      localizedReason: 'Authenticate to continue to your locker account',
      options: const AuthenticationOptions(
        biometricOnly: true,
        stickyAuth: true,
      ),
    );
  }

  Future<AccountChallenge> findMyAccount({
    required String email,
    required String password,
    required String keyId,
  }) async {
    final payload = await _post(
      '/api/auth/b2c/find-account',
      {'email': email, 'password': password, 'key_id': keyId},
    );

    return AccountChallenge(
      transactionId: payload['transactionId']?.toString() ?? '',
      userId: payload['userId']?.toString() ?? '',
      userName: payload['userName']?.toString() ?? 'User',
    );
  }

  Future<AuthResult> verifyOtpAndRegisterDevice({
    required AccountChallenge challenge,
    required String otp,
  }) async {
    final verifyPayload = await _post('/api/auth/b2c/verify-otp', {
      'transactionId': challenge.transactionId,
      'otp': otp,
    });

    final token = verifyPayload['token']?.toString() ?? '';
    final userJson = verifyPayload['user'] as Map<String, dynamic>? ?? const {};
    final user = UserProfile.fromJson(userJson);

    final keyPair = await _cryptoService.generateRsaKeyPair();

    await _post('/api/auth/b2c/register-device', {
      'transactionId': challenge.transactionId,
      'otp': otp,
      'userId': user.id,
      'devicePublicKey': keyPair.publicKeyJwk,
    });

    await saveTrustedIdentity(
      userId: user.id,
      userName: user.name,
      privateKey: keyPair.privateKeyJwk,
    );

    return AuthResult(baseUrl: baseUrl, token: token, user: user);
  }

  Future<TrustedIdentity> registerAndBindCurrentDevice({
    required String name,
    required String email,
    required String password,
  }) async {
    final keyPair = await _cryptoService.generateRsaKeyPair();

    final payload = await _post('/api/users/add', {
      'name': name,
      'email': email,
      'password': password,
      'devicePublicKey': keyPair.publicKeyJwk,
    });

    final userJson = payload['user'] as Map<String, dynamic>? ?? const {};
    final userId = userJson['id']?.toString() ?? userJson['user_id']?.toString() ?? '';
    final userName = userJson['name']?.toString() ?? name;

    if (userId.isEmpty) {
      throw Exception('Registration succeeded but user id is missing.');
    }

    await saveTrustedIdentity(
      userId: userId,
      userName: userName,
      privateKey: keyPair.privateKeyJwk,
    );

    await setBiometricEnabled(false);

    return TrustedIdentity(
      userId: userId,
      userName: userName,
      privateKey: keyPair.privateKeyJwk,
      isBiometricEnabled: false,
    );
  }

  Future<void> ensureTrustedDeviceRegistration(AuthResult result) async {
    final current = await loadTrustedIdentity();

    if (current.hasTrustedDeviceData && current.userId == result.user.id) {
      if (current.userName != result.user.name) {
        await _secureStorage.write(key: _kUserName, value: result.user.name);
      }
      return;
    }

    final keyPair = await _cryptoService.generateRsaKeyPair();

    await _post(
      '/api/auth/b2c/register-device-authenticated',
      {
        'userId': result.user.id,
        'devicePublicKey': keyPair.publicKeyJwk,
      },
      bearerToken: result.token,
    );

    await saveTrustedIdentity(
      userId: result.user.id,
      userName: result.user.name,
      privateKey: keyPair.privateKeyJwk,
    );

    // New trust binding should start with biometric opt-in disabled.
    await setBiometricEnabled(false);
  }

  Future<AuthResult> loginTrustedDeviceWithPassword({
    required String password,
  }) async {
    final identity = await loadTrustedIdentity();
    if (!identity.hasTrustedDeviceData) {
      throw Exception('Trusted device data is missing. Use Find My Account first.');
    }

    final signedPayload = '${identity.userId}:$password';
    final signature = _cryptoService.signPayload(
      payload: signedPayload,
      privateKeyJwk: identity.privateKey,
    );

    final payload = await _post('/api/auth/b2c/device-login', {
      'userId': identity.userId,
      'password': password,
      'deviceSignature': signature,
    });

    final token = payload['token']?.toString() ?? '';
    final userJson = payload['user'] as Map<String, dynamic>? ?? const {};
    final user = UserProfile.fromJson(userJson);

    return AuthResult(baseUrl: baseUrl, token: token, user: user);
  }

  Future<AuthResult> loginTrustedDeviceWithBiometric() async {
    final identity = await loadTrustedIdentity();
    if (!identity.hasTrustedDeviceData) {
      throw Exception('Trusted device data is missing. Use Find My Account first.');
    }

    final signedPayload =
        '${identity.userId}:biometric:${DateTime.now().millisecondsSinceEpoch}';
    final signature = _cryptoService.signPayload(
      payload: signedPayload,
      privateKeyJwk: identity.privateKey,
    );

    final payload = await _post('/api/auth/b2c/device-login-biometric', {
      'userId': identity.userId,
      'signedPayload': signedPayload,
      'deviceSignature': signature,
    });

    final token = payload['token']?.toString() ?? '';
    final userJson = payload['user'] as Map<String, dynamic>? ?? const {};
    final user = UserProfile.fromJson(userJson);

    return AuthResult(baseUrl: baseUrl, token: token, user: user);
  }

  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> body,
    {String? bearerToken}
  ) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (bearerToken != null && bearerToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $bearerToken';
    }

    final response = await _httpClient.post(
      uri,
      headers: headers,
      body: jsonEncode(body),
    );

    final decoded =
        jsonDecode(response.body) as Map<String, dynamic>? ?? const {};

    if (response.statusCode >= 400) {
      throw ApiError(
        decoded['message']?.toString() ?? 'Request failed: ${response.statusCode}',
        statusCode: response.statusCode,
        payload: decoded,
      );
    }

    return decoded;
  }
}
