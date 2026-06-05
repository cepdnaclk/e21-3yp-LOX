import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/errors/api_error.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/url_utils.dart';
import '../../../data/local/local_store.dart';
import '../../../data/models/auth_result.dart';
import '../../../data/remote/api_client.dart';

enum _OtpVerificationMode { device, legacy }

class OTPVerificationScreen extends StatefulWidget {
  const OTPVerificationScreen({
    super.key,
    required this.authService,
    required this.challenge,
    required this.onAuthSuccess,
  })  : mode = _OtpVerificationMode.legacy,
        email = '',
        keyId = '',
        publicKey = '';

  const OTPVerificationScreen.legacy({
    super.key,
    required this.authService,
    required this.challenge,
    required this.onAuthSuccess,
  })  : mode = _OtpVerificationMode.legacy,
        email = '',
        keyId = '',
        publicKey = '';

  const OTPVerificationScreen.device({
    super.key,
    required this.email,
    required this.keyId,
    required this.publicKey,
    this.onAuthSuccess,
  })  : mode = _OtpVerificationMode.device,
        authService = null,
        challenge = null;

  final _OtpVerificationMode mode;
  final String email;
  final String keyId;
  final String publicKey;
  final AuthService? authService;
  final AccountChallenge? challenge;
  final Future<void> Function(AuthResult result)? onAuthSuccess;

  @override
  State<OTPVerificationScreen> createState() => _OTPVerificationScreenState();
}

class _OTPVerificationScreenState extends State<OTPVerificationScreen> {
  late final List<TextEditingController> _digitControllers;
  late final List<FocusNode> _focusNodes;
  Timer? _timer;
  int _remainingSeconds = 5 * 60;
  bool _submitting = false;
  bool _completed = false;
  String? _errorMessage;

  bool get _isLegacyMode => widget.mode == _OtpVerificationMode.legacy;

  @override
  void initState() {
    super.initState();
    _digitControllers = List.generate(6, (_) => TextEditingController());
    _focusNodes = List.generate(6, (_) => FocusNode());
    _timer = Timer.periodic(const Duration(seconds: 1), _tick);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        _focusNodes.first.requestFocus();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    for (final controller in _digitControllers) {
      controller.dispose();
    }
    for (final focusNode in _focusNodes) {
      focusNode.dispose();
    }
    super.dispose();
  }

  void _tick(Timer timer) {
    if (_remainingSeconds <= 0) {
      timer.cancel();
      if (!mounted || _completed) {
        return;
      }
      setState(() {
        _errorMessage = 'Invalid or expired code';
      });
      return;
    }

    setState(() {
      _remainingSeconds -= 1;
    });
  }

  String get _code => _digitControllers.map((controller) => controller.text).join();

  Future<void> _submit() async {
    if (_submitting || _completed) {
      return;
    }

    final code = _code;
    if (code.length != 6 || code.contains(RegExp(r'[^0-9]'))) {
      return;
    }

    setState(() {
      _submitting = true;
      _errorMessage = null;
    });

    try {
      final baseUrl = normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);
      final result = _isLegacyMode
          ? await widget.authService!.verifyOtpAndRegisterDevice(
              challenge: widget.challenge!,
              otp: code,
            )
          : await ApiClient(baseUrl: baseUrl, token: '').verifyDevice(
              email: widget.email,
              otpCode: code,
              keyId: widget.keyId,
              publicKey: widget.publicKey,
            );

      await LocalStore.saveBootstrap(baseUrl: baseUrl, token: result.token);
      await LocalStore.saveDeviceInitialized(true);

      _completed = true;

      if (widget.onAuthSuccess != null) {
        await widget.onAuthSuccess!(result);
      }

      if (mounted) {
        Navigator.of(context).pop(result);
      }
    } on ApiError catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.statusCode == 400
            ? 'Invalid or expired code'
            : error.toString();
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _errorMessage = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
        });
      }
    }
  }

  void _clearCode() {
    for (final controller in _digitControllers) {
      controller.clear();
    }
    setState(() {
      _errorMessage = null;
    });
    _focusNodes.first.requestFocus();
  }

  void _handleDigitChanged(int index, String value) {
    if (value.isEmpty) {
      return;
    }

    final digit = value.substring(value.length - 1);
    _digitControllers[index].text = digit;
    _digitControllers[index].selection = const TextSelection.collapsed(offset: 1);

    if (index < _focusNodes.length - 1) {
      _focusNodes[index + 1].requestFocus();
    } else {
      FocusScope.of(context).unfocus();
      unawaited(_submit());
    }
  }

  void _handleKeyEvent(int index, KeyEvent event) {
    if (event is! KeyDownEvent) {
      return;
    }

    if (event.logicalKey == LogicalKeyboardKey.backspace &&
        _digitControllers[index].text.isEmpty &&
        index > 0) {
      _focusNodes[index - 1].requestFocus();
      _digitControllers[index - 1].clear();
    }
  }

  String _formatRemainingTime() {
    final minutes = _remainingSeconds ~/ 60;
    final seconds = _remainingSeconds % 60;
    return '${minutes.toString().padLeft(2, '0')}:${seconds.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final title = _isLegacyMode
        ? 'Enter your verification code'
        : 'Verify this device';
    final subtitle = _isLegacyMode
        ? 'A code was sent to continue account verification.'
        : 'A verification code has been sent to ${widget.email}. Someone is trying to log into your Smart Locker account from an unrecognized device.';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.background,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textMain),
        title: const Text('Verification'),
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
              children: [
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    border: Border.all(color: const Color(0xFFE3E7DD)),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x12000000),
                        blurRadius: 30,
                        offset: Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'SMART LOCKER SECURITY',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.3,
                          color: AppColors.textLabel,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        title,
                        style: const TextStyle(
                          fontSize: 30,
                          height: 1.1,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textMain,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.6,
                          color: AppColors.textLabel,
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 18,
                          vertical: 14,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF6F7F2),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFD9DEC8)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Code expires in',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textLabel,
                              ),
                            ),
                            Text(
                              _formatRemainingTime(),
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textMain,
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 28),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: List.generate(6, (index) {
                          return SizedBox(
                            width: 48,
                            child: Focus(
                              onKeyEvent: (_, event) {
                                _handleKeyEvent(index, event);
                                return KeyEventResult.ignored;
                              },
                              child: TextField(
                                controller: _digitControllers[index],
                                focusNode: _focusNodes[index],
                                keyboardType: TextInputType.number,
                                textAlign: TextAlign.center,
                                maxLength: 1,
                                inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                cursorColor: AppColors.olive,
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w800,
                                  color: AppColors.textMain,
                                ),
                                decoration: InputDecoration(
                                  counterText: '',
                                  filled: true,
                                  fillColor: const Color(0xFFF8F8F6),
                                  contentPadding: const EdgeInsets.symmetric(
                                    vertical: 16,
                                  ),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(
                                      color: Color(0xFFD7DBC7),
                                    ),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(
                                      color: Color(0xFFD7DBC7),
                                    ),
                                  ),
                                  focusedBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(16),
                                    borderSide: const BorderSide(
                                      color: AppColors.olive,
                                      width: 1.6,
                                    ),
                                  ),
                                ),
                                onChanged: (value) {
                                  _handleDigitChanged(index, value);
                                },
                              ),
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: 20),
                      AnimatedSwitcher(
                        duration: const Duration(milliseconds: 180),
                        child: _errorMessage == null
                            ? const SizedBox.shrink()
                            : Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF4F4),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0xFFF1B5B5)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Invalid or expired code',
                                      style: TextStyle(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w800,
                                        color: Color(0xFFB42318),
                                      ),
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      _errorMessage!,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        color: Color(0xFF7A271A),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    TextButton(
                                      onPressed: _clearCode,
                                      child: const Text('Clear code and try again'),
                                    ),
                                  ],
                                ),
                              ),
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity,
                        height: 54,
                        child: ElevatedButton(
                          onPressed: _submitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.olive,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                          child: _submitting
                              ? const SizedBox(
                                  width: 22,
                                  height: 22,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2.2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Text(
                                  'VERIFY CODE',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w800,
                                    letterSpacing: 0.6,
                                  ),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
