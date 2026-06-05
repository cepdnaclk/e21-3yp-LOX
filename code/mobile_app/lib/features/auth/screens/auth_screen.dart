import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/services/auth_service.dart';
import '../../../core/utils/url_utils.dart';
import '../../../data/models/auth_result.dart';
import 'find_account_screen.dart';
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
  bool _loadingIdentity = true;
  late final AuthService _authService;
  TrustedIdentity? _trustedIdentity;
  AuthView _view = AuthView.landing;

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

  void _openRegister() {
    setState(() {
      _view = AuthView.register;
    });
  }

  void _openLoginFlow() {
    setState(() {
      _view = _trustedIdentity != null ? AuthView.trustedLogin : AuthView.findAccount;
    });
  }

  void _openLanding() {
    setState(() {
      _view = AuthView.landing;
    });
  }

  void _handleAccountChallenge(AccountChallenge challenge) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => OTPVerificationScreen(
          authService: _authService,
          challenge: challenge,
          onAuthSuccess: widget.onAuthSuccess,
        ),
      ),
    );
  }

  Future<void> _onRegistrationCompleted() async {
    if (!mounted) return;
    setState(() {
      _loadingIdentity = true;
      _view = AuthView.landing;
    });
    await _loadTrustedIdentity();
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingIdentity) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    switch (_view) {
      case AuthView.landing:
        return _AuthLandingPage(
          errorMessage: widget.errorMessage,
          onLoginTap: _openLoginFlow,
          onRegisterTap: _openRegister,
        );
      case AuthView.register:
        return RegisterScreen(
          onRegistrationCompleted: _onRegistrationCompleted,
          onLoginTap: _openLoginFlow,
          onBackTap: _openLanding,
        );
      case AuthView.trustedLogin:
        return TrustedDeviceLoginScreen(
          authService: _authService,
          identity: _trustedIdentity!,
          onAuthSuccess: widget.onAuthSuccess,
          onBackTap: _openLanding,
          onJoinTap: _openRegister,
        );
      case AuthView.findAccount:
        return FindAccountScreen(
          authService: _authService,
          onChallengeReady: _handleAccountChallenge,
          onAuthSuccess: widget.onAuthSuccess,
          onBackTap: _openLanding,
          onJoinTap: _openRegister,
        );
    }
  }
}

enum AuthView { landing, register, trustedLogin, findAccount }

class _AuthLandingPage extends StatefulWidget {
  const _AuthLandingPage({
    required this.onLoginTap,
    required this.onRegisterTap,
    this.errorMessage,
  });

  final VoidCallback onLoginTap;
  final VoidCallback onRegisterTap;
  final String? errorMessage;

  @override
  State<_AuthLandingPage> createState() => _AuthLandingPageState();
}

class _AuthLandingPageState extends State<_AuthLandingPage> {
  late final PageController _pageController;
  Timer? _timer;
  int _currentPage = 0;

  final List<_AuthSlide> _slides = const [
    _AuthSlide(
      title: 'Smart access, one glance away',
      subtitle: 'Track locker access, stations, and requests from a single secure app.',
      icon: Icons.lock_outline,
      color: Color(0xFFEEF2E5),
    ),
    _AuthSlide(
      title: 'Trusted devices stay fast',
      subtitle: 'Recognized devices can sign in quickly with saved credentials.',
      icon: Icons.phone_iphone_outlined,
      color: Color(0xFFF4F1E8),
    ),
    _AuthSlide(
      title: 'Account protection built in',
      subtitle: 'Enable biometrics later to keep your trusted device secure.',
      icon: Icons.fingerprint,
      color: Color(0xFFE9EEF2),
    ),
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!_pageController.hasClients) {
        return;
      }
      final nextPage = (_currentPage + 1) % _slides.length;
      _pageController.animateToPage(
        nextPage,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF2F1EF),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          children: [
            const SizedBox(height: 8),
            SizedBox(
              height: 280,
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() {
                    _currentPage = index;
                  });
                },
                itemCount: _slides.length,
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return AnimatedPadding(
                    duration: const Duration(milliseconds: 250),
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: Container(
                      decoration: BoxDecoration(
                        color: slide.color,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: Colors.black12),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.end,
                          children: [
                            CircleAvatar(
                              radius: 28,
                              backgroundColor: Colors.white,
                              child: Icon(slide.icon, color: Colors.black87, size: 28),
                            ),
                            const SizedBox(height: 20),
                            Text(
                              slide.title,
                              style: const TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w800,
                                color: Colors.black87,
                                letterSpacing: -0.4,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              slide.subtitle,
                              style: const TextStyle(
                                fontSize: 13,
                                height: 1.5,
                                color: Colors.black54,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(
                _slides.length,
                (index) => AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: _currentPage == index ? 22 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: _currentPage == index
                        ? const Color(0xFF64674B)
                        : Colors.black26,
                    borderRadius: BorderRadius.circular(999),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 28),
            const Text(
              'Welcome to LoX',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.w800,
                color: Color(0xFF1E1E1E),
                letterSpacing: -0.6,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Choose how you want to continue.',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 13,
                color: Colors.black54,
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: SizedBox(
                    height: 54,
                    child: ElevatedButton(
                      onPressed: widget.onLoginTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF64674B),
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        elevation: 0,
                      ),
                      child: const Text(
                        'LOGIN',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.6,
                        ),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: SizedBox(
                    height: 54,
                    child: OutlinedButton(
                      onPressed: widget.onRegisterTap,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: const Color(0xFF1E1E1E),
                        side: const BorderSide(color: Color(0xFF64674B)),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                      ),
                      child: const Text(
                        'REGISTER',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          letterSpacing: 1.6,
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
            if (widget.errorMessage != null) ...[
              const SizedBox(height: 18),
              Text(
                widget.errorMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _AuthSlide {
  const _AuthSlide({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
}
