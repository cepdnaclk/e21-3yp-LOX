import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:pointycastle/export.dart';

class DeviceKeyPair {
  const DeviceKeyPair({required this.publicKeyJwk, required this.privateKeyJwk});

  final String publicKeyJwk;
  final String privateKeyJwk;
}

class CryptoService {
  const CryptoService();

  Future<DeviceKeyPair> generateRsaKeyPair({int bitLength = 2048}) async {
    final generator = RSAKeyGenerator();
    generator.init(
      ParametersWithRandom(
        RSAKeyGeneratorParameters(BigInt.parse('65537'), bitLength, 64),
        _secureRandom(),
      ),
    );

    final keyPair = generator.generateKeyPair();
    final publicKey = keyPair.publicKey as RSAPublicKey;
    final privateKey = keyPair.privateKey as RSAPrivateKey;

    final publicJwk = jsonEncode({
      'kty': 'RSA',
      'alg': 'RS256',
      'use': 'sig',
      'n': _bigIntToBase64Url(publicKey.modulus!),
      'e': _bigIntToBase64Url(publicKey.exponent!),
    });

    final privateJwk = jsonEncode({
      'kty': 'RSA',
      'alg': 'RS256',
      'n': _bigIntToBase64Url(privateKey.n!),
      'e': _bigIntToBase64Url(BigInt.parse('65537')),
      'd': _bigIntToBase64Url(privateKey.privateExponent!),
      'p': _bigIntToBase64Url(privateKey.p!),
      'q': _bigIntToBase64Url(privateKey.q!),
    });

    return DeviceKeyPair(publicKeyJwk: publicJwk, privateKeyJwk: privateJwk);
  }

  String signPayload({required String payload, required String privateKeyJwk}) {
    final parsed = jsonDecode(privateKeyJwk) as Map<String, dynamic>;
    final privateKey = RSAPrivateKey(
      _base64UrlToBigInt(parsed['n'] as String),
      _base64UrlToBigInt(parsed['d'] as String),
      _base64UrlToBigInt(parsed['p'] as String),
      _base64UrlToBigInt(parsed['q'] as String),
    );

    final signer = RSASigner(SHA256Digest(), '0609608648016503040201');
    signer.init(true, PrivateKeyParameter<RSAPrivateKey>(privateKey));

    final signature = signer.generateSignature(
      Uint8List.fromList(utf8.encode(payload)),
    );

    return base64Encode(signature.bytes);
  }

  SecureRandom _secureRandom() {
    final random = FortunaRandom();
    final seed = Uint8List.fromList(
      List<int>.generate(32, (_) => Random.secure().nextInt(256)),
    );
    random.seed(KeyParameter(seed));
    return random;
  }

  String _bigIntToBase64Url(BigInt number) {
    final bytes = _bigIntToBytes(number);
    return base64UrlEncode(bytes).replaceAll('=', '');
  }

  BigInt _base64UrlToBigInt(String value) {
    final normalized = value.padRight((value.length + 3) ~/ 4 * 4, '=');
    final bytes = base64Url.decode(normalized);
    return _bytesToBigInt(bytes);
  }

  Uint8List _bigIntToBytes(BigInt number) {
    var hex = number.toRadixString(16);
    if (hex.length.isOdd) {
      hex = '0$hex';
    }

    final bytes = Uint8List(hex.length ~/ 2);
    for (var i = 0; i < hex.length; i += 2) {
      bytes[i ~/ 2] = int.parse(hex.substring(i, i + 2), radix: 16);
    }
    return bytes;
  }

  BigInt _bytesToBigInt(Uint8List bytes) {
    var result = BigInt.zero;
    for (final byte in bytes) {
      result = (result << 8) | BigInt.from(byte);
    }
    return result;
  }
}
