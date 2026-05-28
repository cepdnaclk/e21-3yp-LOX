import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../../../core/services/auth_service.dart';
import '../../../core/theme/app_colors.dart';
import '../../../data/models/auth_result.dart';

class TrustedDeviceLoginScreen extends StatefulWidget {
  const TrustedDeviceLoginScreen({
    super.key,
    required this.authService,
    required this.identity,
    required this.onAuthSuccess,
    this.onRegisterTap,
  });

  final AuthService authService;
  final TrustedIdentity identity;
  final Future<void> Function(AuthResult result) onAuthSuccess;
  final VoidCallback? onRegisterTap;

  @override
  State<TrustedDeviceLoginScreen> createState() =>
      _TrustedDeviceLoginScreenState();
}

class _TrustedDeviceLoginScreenState extends State<TrustedDeviceLoginScreen> {
  late final TextEditingController _passwordController;
  bool _submitting = false;
  bool _didTryBiometric = false;

  @override
  void initState() {
    super.initState();
    _passwordController = TextEditingController();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _triggerBiometricIfEnabled();
    });
  }

  @override
  void dispose() {
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _triggerBiometricIfEnabled() async {
    if (_didTryBiometric || !widget.identity.isBiometricEnabled) {
      return;
    }
    _didTryBiometric = true;

    final passed = await widget.authService.promptForBiometric();
    if (!passed) {
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await widget.authService.loginTrustedDeviceWithBiometric();
      await widget.onAuthSuccess(result);
    } catch (error) {
      if (mounted) {
        _showError(error.toString());
      }
    }
    if (mounted) {
      setState(() => _submitting = false);
    }
  }

  Future<void> _manualLogin() async {
    final password = _passwordController.text;
    if (password.isEmpty) {
      _showError('Password is required.');
      return;
    }

    setState(() => _submitting = true);
    try {
      final result = await widget.authService.loginTrustedDeviceWithPassword(
        password: password,
      );
      await widget.onAuthSuccess(result);
    } catch (error) {
      if (mounted) {
        _showError(error.toString());
      }
    }
    if (mounted) {
      setState(() => _submitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 28),
          children: [
            const SizedBox(height: 36),
            SvgPicture.asset(
              'assets/images/lox_logo_auth.svg',
              width: 90,
              height: 90,
            ),
            const SizedBox(height: 16),
            Text(
              'Hello ${widget.identity.userName}, welcome back!',
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: AppColors.textMain,
                letterSpacing: -0.3,
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'YOUR DEVICE IS RECOGNIZED',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 34),
            const Text(
              'PASSWORD',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
                color: AppColors.textLabel,
              ),
            ),
            const SizedBox(height: 8),
            Container(
              decoration: BoxDecoration(
                color: AppColors.fieldBackground,
                borderRadius: BorderRadius.circular(14),
              ),
              child: TextField(
                controller: _passwordController,
                obscureText: true,
                style: const TextStyle(
                  fontSize: 16,
                  color: AppColors.textField,
                  fontWeight: FontWeight.w500,
                ),
                decoration: const InputDecoration(
                  hintText: '••••••••',
                  hintStyle: TextStyle(
                    color: AppColors.textHint,
                    fontWeight: FontWeight.w400,
                  ),
                  prefixIcon: Icon(
                    Icons.vpn_key_outlined,
                    color: AppColors.textHint,
                    size: 20,
                  ),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 30),
            SizedBox(
              height: 56,
              child: ElevatedButton(
                onPressed: _submitting ? null : _manualLogin,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.olive,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(32),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Colors.white,
                        ),
                      )
                    : const Text(
                        'LOGIN',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.8,
                        ),
                      ),
              ),
            ),
            const SizedBox(height: 14),
            if (widget.onRegisterTap != null)
              Center(
                child: TextButton(
                  onPressed: _submitting ? null : widget.onRegisterTap,
                  child: const Text(
                    'Register screen',
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
