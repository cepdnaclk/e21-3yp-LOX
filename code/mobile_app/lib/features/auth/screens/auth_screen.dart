import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/utils/url_utils.dart';
import '../../../data/models/auth_result.dart';
import 'find_account_screen.dart';
import 'new_device_login_screen.dart';
import 'otp_verification_screen.dart';
import 'register_screen.dart';
import 'trusted_device_login_screen.dart';

/// The entry point for all authentication-related flows.
///
/// Manages the state between the [LoginScreen] and [RegisterScreen] 
/// using an IndexedStack to preserve user input while toggling between forms.

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key, required this.onAuthSuccess, this.errorMessage});

  final Future<void> Function(AuthResult result) onAuthSuccess;
  final String? errorMessage;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  int _tabIndex = 0; // Login by default
  bool _loadingIdentity = true;
  bool _showRegisterForTrustedUser = false;
  late final AuthService _authService;
  TrustedIdentity? _trustedIdentity;

  @override
  void initState() {
    super.initState();
    _authService = AuthService(
      baseUrl: normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl),
    );
    _loadTrustedIdentity();
  }

  Future<void> _loadTrustedIdentity() async {
    final identity = await _authService.loadTrustedIdentity();
    if (!mounted) return;

    setState(() {
      _trustedIdentity = identity.hasTrustedDeviceData ? identity : null;
      _loadingIdentity = false;
    });
  }

  Future<void> _startFindMyAccountFlow() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FindAccountScreen(
          authService: _authService,
          onChallengeReady: (challenge) {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (_) => OTPVerificationScreen(
                  authService: _authService,
                  challenge: challenge,
                  onAuthSuccess: widget.onAuthSuccess,
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  Future<void> _onRegistrationCompleted() async {
    if (!mounted) return;
    setState(() {
      _loadingIdentity = true;
      _tabIndex = 0;
      _showRegisterForTrustedUser = false;
    });
    await _loadTrustedIdentity();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingIdentity) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_trustedIdentity != null && !_showRegisterForTrustedUser) {
      return TrustedDeviceLoginScreen(
        authService: _authService,
        identity: _trustedIdentity!,
        onAuthSuccess: widget.onAuthSuccess,
        onRegisterTap: () => setState(() => _showRegisterForTrustedUser = true),
      );
    }

    if (_trustedIdentity != null && _showRegisterForTrustedUser) {
      return RegisterScreen(
        onRegistrationCompleted: _onRegistrationCompleted,
        onLoginTap: () => setState(() => _showRegisterForTrustedUser = false),
      );
    }

    return IndexedStack(
      index: _tabIndex,
      children: [
        NewDeviceLoginScreen(
          onFindAccountTap: _startFindMyAccountFlow,
          onJoinTap: () => setState(() => _tabIndex = 1),
        ),
        RegisterScreen(
          onRegistrationCompleted: _onRegistrationCompleted,
          onLoginTap: () => setState(() => _tabIndex = 0),
        ),
      ],
    );
  }
}
