import 'dart:async';

import 'package:flutter/material.dart';
import 'package:app_links/app_links.dart';
import 'package:google_fonts/google_fonts.dart';

import '../core/constants/app_constants.dart';
import '../core/utils/url_utils.dart';

import '../data/local/local_store.dart';
import '../data/models/auth_result.dart';
import '../data/models/session_data.dart';
import '../data/remote/api_client.dart';

import '../features/auth/screens/auth_screen.dart';
import '../features/home/screens/home_screen.dart';
import '../core/services/notification_service.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/theme_style.dart';
import '../core/theme/page_transitions.dart';

/// The root widget of the Smart Locker application.
///
/// This widget acts as the entry point for the UI. It is responsible for:
/// 1. Bootstrapping the app by checking local storage for an existing token.
/// 2. Managing the global authentication state ([_session]).
/// 3. Routing the user to either the [AuthScreen] or [HomeScreen] based on their state

enum AppThemePreset { olive, ocean, sunset, forest, slate }

final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier<ThemeMode>(ThemeMode.light);
final ValueNotifier<AppThemePreset> themePresetNotifier = ValueNotifier<AppThemePreset>(AppThemePreset.olive);

class SmartLockerApp extends StatefulWidget {
  const SmartLockerApp({super.key});

  @override
  State<SmartLockerApp> createState() => _SmartLockerAppState();
}

class _SmartLockerAppState extends State<SmartLockerApp> {
  bool _loading = true;
  SessionData? _session;
  String? _bootError;

  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();
  final GlobalKey<HomeScreenState> _homeKey = GlobalKey<HomeScreenState>();

  // Deep-link listener for payment callbacks (loxapp://payment?payment=...)
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _deepLinkSub;

  // Get the base url state
  String get _baseUrl => normalizeApiBaseUrl(AppConstants.defaultApiBaseUrl);

  // Immediately check for a saved login token on device startup
  @override
  void initState() {
    super.initState();
    _loadThemeMode();
    _restoreSession();
    _initDeepLinks();
  }

  Future<void> _loadThemeMode() async {
    themeNotifier.value = await LocalStore.loadThemeMode();
    final presetName = await LocalStore.loadThemePreset();
    themePresetNotifier.value = AppThemePreset.values.firstWhere(
      (e) => e.name == presetName,
      orElse: () => AppThemePreset.olive,
    );
  }

  void updateAppColors(AppThemePreset preset, ThemeMode mode, BuildContext context) {
    final brightness = mode == ThemeMode.system
        ? MediaQuery.platformBrightnessOf(context)
        : (mode == ThemeMode.dark ? Brightness.dark : Brightness.light);

    Color primary;
    Color primaryDark;
    
    switch (preset) {
      case AppThemePreset.ocean:
        primary = const Color(0xFF0F52BA);
        primaryDark = const Color(0xFF1D4ED8);
        break;
      case AppThemePreset.sunset:
        primary = const Color(0xFFD97706);
        primaryDark = const Color(0xFFB45309);
        break;
      case AppThemePreset.forest:
        primary = const Color(0xFF15803D);
        primaryDark = const Color(0xFF166534);
        break;
      case AppThemePreset.slate:
        primary = const Color(0xFF0DFFC2);
        primaryDark = const Color(0xFF0A9D78);
        break;
      case AppThemePreset.olive:
      default:
        primary = const Color(0xFF5C5F3E);
        primaryDark = const Color(0xFF6B6E50);
        break;
    }

    AppColors.olive = primary;
    AppColors.oliveDark = primaryDark;
  }

  ThemeData buildThemeData(AppThemePreset preset, Brightness brightness) {
    Color seedColor;
    Color scaffoldBg;
    
    // Force slate gray (cyberpunk theme) to always be dark mode!
    final actualBrightness = preset == AppThemePreset.slate ? Brightness.dark : brightness;
    final isLight = actualBrightness == Brightness.light;

    double cardRadius;
    double buttonRadius;
    double fieldRadius;
    Border? cardBorder;
    List<BoxShadow>? cardShadow;
    Color navBarBg;
    Border? navBarBorder;
    double navBarBlur;
    Color navBarActiveColor;
    Color? glowColor;
    Color? cardBg;

    TextTheme baseTextTheme = actualBrightness == Brightness.dark 
        ? ThemeData.dark().textTheme 
        : ThemeData.light().textTheme;
        
    final textTheme = GoogleFonts.outfitTextTheme(baseTextTheme);

    switch (preset) {
      case AppThemePreset.ocean:
        seedColor = const Color(0xFF0F52BA);
        scaffoldBg = isLight ? const Color(0xFFF0F4F8) : const Color(0xFF0F172A);
        cardRadius = 24.0;
        buttonRadius = 99.0;
        fieldRadius = 20.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.15 : 0.25),
          width: 1.5,
        );
        cardShadow = [
          BoxShadow(
            color: seedColor.withOpacity(isLight ? 0.05 : 0.12),
            blurRadius: 20,
            offset: const Offset(0, 10),
          )
        ];
        navBarBg = (isLight ? const Color(0xFFF0F4F8) : const Color(0xFF0F172A)).withOpacity(0.7);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.2 : 0.3),
          width: 1,
        );
        navBarBlur = 14.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF1E293B);
        break;

      case AppThemePreset.sunset:
        seedColor = const Color(0xFFD97706);
        scaffoldBg = isLight ? const Color(0xFFFFF7ED) : const Color(0xFF1C1917);
        cardRadius = 16.0;
        buttonRadius = 12.0;
        fieldRadius = 12.0;
        cardShadow = [
          BoxShadow(
            color: const Color(0xFFD97706).withOpacity(isLight ? 0.05 : 0.1),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = (isLight ? const Color(0xFFFFF7ED) : const Color(0xFF1C1917)).withOpacity(0.75);
        navBarBlur = 8.0;
        navBarActiveColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF272522);
        break;

      case AppThemePreset.forest:
        seedColor = const Color(0xFF15803D);
        scaffoldBg = isLight ? const Color(0xFFF0FDF4) : const Color(0xFF052E16);
        cardRadius = 22.0;
        buttonRadius = 24.0;
        fieldRadius = 16.0;
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.03 : 0.1),
            blurRadius: 16,
            offset: const Offset(0, 8),
          )
        ];
        navBarBg = (isLight ? const Color(0xFFF0FDF4) : const Color(0xFF052E16)).withOpacity(0.75);
        navBarBlur = 12.0;
        navBarActiveColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF063F1D);
        break;

      case AppThemePreset.slate: // Cyberpunk Neon Teal Theme!
        seedColor = const Color(0xFF0DFFC2);
        scaffoldBg = const Color(0xFF090D16);
        cardRadius = 8.0;
        buttonRadius = 6.0;
        fieldRadius = 6.0;
        cardBg = const Color(0xFF111827);
        cardBorder = Border.all(
          color: const Color(0xFF0DFFC2).withOpacity(0.4),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: const Color(0xFF0DFFC2).withOpacity(0.15),
            blurRadius: 12,
            offset: Offset.zero,
          )
        ];
        navBarBg = const Color(0xFF090D16).withOpacity(0.75);
        navBarBorder = Border.all(
          color: const Color(0xFF0DFFC2).withOpacity(0.5),
          width: 1.2,
        );
        navBarBlur = 16.0;
        navBarActiveColor = const Color(0xFF0DFFC2);
        glowColor = const Color(0xFF0DFFC2);
        break;

      case AppThemePreset.olive:
      default:
        seedColor = const Color(0xFF5C5F3E);
        scaffoldBg = isLight ? const Color(0xFFF2F1EF) : const Color(0xFF1C1C1A);
        cardRadius = 20.0;
        buttonRadius = 16.0;
        fieldRadius = 14.0;
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 14,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = (isLight ? const Color(0xFFF2F1EF) : const Color(0xFF1C1C1A)).withOpacity(0.85);
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF262624);
        break;
    }

    return ThemeData(
      brightness: actualBrightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: seedColor,
        brightness: actualBrightness,
        primary: seedColor,
        surface: cardBg ?? (isLight ? Colors.white : const Color(0xFF1A1A1A)),
      ),
      scaffoldBackgroundColor: scaffoldBg,
      useMaterial3: true,
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: PremiumPageTransitionsBuilder(),
          TargetPlatform.iOS: PremiumPageTransitionsBuilder(),
          TargetPlatform.macOS: PremiumPageTransitionsBuilder(),
          TargetPlatform.windows: PremiumPageTransitionsBuilder(),
          TargetPlatform.linux: PremiumPageTransitionsBuilder(),
        },
      ),
      textTheme: textTheme,
      extensions: [
        AppThemeStyle(
          cardRadius: cardRadius,
          buttonRadius: buttonRadius,
          fieldRadius: fieldRadius,
          cardBorder: cardBorder,
          cardShadow: cardShadow,
          navBarBg: navBarBg,
          navBarBorder: navBarBorder,
          navBarBlur: navBarBlur,
          navBarActiveColor: navBarActiveColor,
          glowColor: glowColor,
          cardBg: cardBg,
        ),
      ],
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      cardTheme: CardThemeData(
        color: cardBg,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(cardRadius),
          side: cardBorder?.top ?? BorderSide.none,
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(buttonRadius),
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(buttonRadius),
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _deepLinkSub?.cancel();
    super.dispose();
  }

  /// Listen for incoming deep links from the loxapp:// scheme.
  /// Stripe redirects here after payment success or cancel.
  void _initDeepLinks() {
    _deepLinkSub = _appLinks.uriLinkStream.listen(
      (uri) => _handleDeepLink(uri),
      onError: (err) => debugPrint('[DeepLink] Error: $err'),
    );
  }

  void _handleDeepLink(Uri uri) {
    debugPrint('[DeepLink] Received: $uri');
    
    // Support both direct parameter and URL path formats
    String? payment = uri.queryParameters['payment'];
    if (payment == null) {
      final isSuccess = uri.host == 'payment-success' || uri.path.contains('payment-success');
      final isCancel = uri.host == 'payment-cancel' || uri.path.contains('payment-cancel');
      final type = uri.queryParameters['type'];
      
      if (type == 'overdue') {
        if (isSuccess) {
          payment = 'overdue_success';
        } else if (isCancel) {
          payment = 'overdue_cancel';
        }
      } else if (type == 'store') {
        if (isSuccess) {
          payment = 'store_success';
        } else if (isCancel) {
          payment = 'store_cancel';
        }
      }
    }

    if (payment == null) return;

    // Use a short delay so the app is fully foregrounded before showing UI
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      final ctx = _navigatorKey.currentContext;
      if (ctx == null) return;
      if (payment == 'overdue_success') {
        _showPaymentResult(
          ctx,
          success: true,
          title: 'Payment Successful',
          message: 'Your overdue fee has been paid. You now have a grace period — unlock your locker and retrieve your items.',
          onDismiss: () {
            _homeKey.currentState?.refreshData();
          },
        );
      } else if (payment == 'overdue_cancel') {
        _showPaymentResult(
          ctx,
          success: false,
          title: 'Payment Cancelled',
          message: 'The payment was cancelled. Your locker is still locked until the overdue fee is paid.',
          onDismiss: () {
            _homeKey.currentState?.refreshData();
          },
        );
      }
    });
  }

  void _showPaymentResult(
    BuildContext ctx, {
    required bool success,
    required String title,
    required String message,
    VoidCallback? onDismiss,
  }) {
    showDialog<void>(
      context: ctx,
      barrierDismissible: false,
      builder: (dialogCtx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        icon: Icon(
          success ? Icons.check_circle_rounded : Icons.cancel_rounded,
          color: success ? const Color(0xFF027A48) : const Color(0xFFC81E1E),
          size: 52,
        ),
        title: Text(
          title,
          textAlign: TextAlign.center,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        content: Text(
          message,
          textAlign: TextAlign.center,
          style: const TextStyle(height: 1.45),
        ),
        actions: [
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: success ? const Color(0xFF027A48) : const Color(0xFF64674B),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              minimumSize: const Size(double.infinity, 44),
            ),
            onPressed: () {
              Navigator.of(dialogCtx).pop();
              if (onDismiss != null) onDismiss();
            },
            child: const Text('OK', style: TextStyle(fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  /// Asynchronously check for a saved token and attempt to restore the session.
  /// If successful, set the session data; if not, just stop loading and show the auth screen.
  Future<void> _restoreSession() async {
    try {
      final bootstrap = await LocalStore.loadBootstrap(); // we only need token
      final token = bootstrap.token;

      // Stop load and show auth screen if no token found
      if (token.isEmpty) {
        setState(() => _loading = false);
        return;
      }

      final client = ApiClient(
        baseUrl: _baseUrl, // always from AppConfig now
        token: token,
      );

      final user = await client.fetchMe(); // fetch already logged in user data

      // the user might have closed the app or navigated away before the server responds
      if (!mounted) return;
      setState(() {
        _session = SessionData(client: client, user: user);
        _loading = false;
        _bootError = null;
      });
      FirebaseNotificationService.instance.initialize(client);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _bootError = error.toString();
      });
    }
  }

  /// Handles authentication success from the [AuthScreen].
  /// Called when the user successfully logs in or registers.
  Future<void> _handleAuthSuccess(AuthResult result) async {
    setState(() {
      _loading = true;
      _bootError = null;
    });

    try {
      final client = ApiClient(
        baseUrl: _baseUrl, // always from AppConfig
        token: result.token,
      );

      // Keep your existing LocalStore method. Store baseUrl too if your model requires it.
      await LocalStore.saveBootstrap(baseUrl: _baseUrl, token: result.token);

      if (!mounted) return;
      setState(() {
        _session = SessionData(client: client, user: result.user);
        _loading = false;
      });
      FirebaseNotificationService.instance.initialize(client);
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _bootError = error.toString();
      });
    }
  }

  /// Handle logout by clearing the saved token and resetting the session state.
  Future<void> _logout() async {
    if (_session != null) {
      try {
        await _session!.client.updateFcmToken('');
      } catch (e) {
        debugPrint('Error clearing FCM token on logout: $e');
      }
    }
    await LocalStore.clearToken();
    if (!mounted) return;
    setState(() {
      _session = null;
    });
  }

  /// Build the main app widget.
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (context, currentThemeMode, _) {
        return ValueListenableBuilder<AppThemePreset>(
          valueListenable: themePresetNotifier,
          builder: (context, currentPreset, _) {
            updateAppColors(currentPreset, currentThemeMode, context);
            return MaterialApp(
              title: 'Smart Locker',
              navigatorKey: _navigatorKey,
              scaffoldMessengerKey: FirebaseNotificationService.instance.scaffoldMessengerKey,
              debugShowCheckedModeBanner: false,
              themeMode: currentThemeMode,
              theme: buildThemeData(currentPreset, Brightness.light),
              darkTheme: buildThemeData(currentPreset, Brightness.dark),
              home: _loading
                  ? const Scaffold(
                      body: Center(child: CircularProgressIndicator()),
                    ) // a loading spinner
                  : _session ==
                        null // No valid session: Show AuthScreen and pass the success callback
                  ? AuthScreen(
                      errorMessage: _bootError,
                      onAuthSuccess: _handleAuthSuccess,
                    )
                  // Valid session: Show HomeScreen and pass the logout callback
                  : HomeScreen(key: _homeKey, session: _session!, onLogout: _logout),
            );
          },
        );
      },
    );
  }
}

