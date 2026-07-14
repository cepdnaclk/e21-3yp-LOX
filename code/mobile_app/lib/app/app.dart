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
        primary = const Color(0xFF1E40AF);
        primaryDark = const Color(0xFF1D4ED8);
        break;
      case AppThemePreset.sunset:
        primary = const Color(0xFFEA580C);
        primaryDark = const Color(0xFFD97706);
        break;
      case AppThemePreset.forest:
        primary = const Color(0xFF047857);
        primaryDark = const Color(0xFF065F46);
        break;
      case AppThemePreset.slate:
        primary = const Color(0xFF475569);
        primaryDark = const Color(0xFF334155);
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
    
    final actualBrightness = brightness;
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
      case AppThemePreset.ocean: // Royal Ocean Blue
        seedColor = const Color(0xFF1E40AF);
        scaffoldBg = isLight ? const Color(0xFFF3F4F6) : const Color(0xFF1B2230);
        cardRadius = 20.0;
        buttonRadius = 16.0;
        fieldRadius = 14.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.18 : 0.35),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 14,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = scaffoldBg.withOpacity(0.9);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.22 : 0.40),
          width: 1.2,
        );
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF273142);
        break;

      case AppThemePreset.sunset: // Coral Sunset
        seedColor = const Color(0xFFEA580C);
        scaffoldBg = isLight ? const Color(0xFFFFF7ED) : const Color(0xFF26201B);
        cardRadius = 16.0;
        buttonRadius = 12.0;
        fieldRadius = 12.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.18 : 0.35),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = scaffoldBg.withOpacity(0.9);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.22 : 0.40),
          width: 1.2,
        );
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF362E28);
        break;

      case AppThemePreset.forest: // Emerald Forest
        seedColor = const Color(0xFF047857);
        scaffoldBg = isLight ? const Color(0xFFF0FDF4) : const Color(0xFF15221E);
        cardRadius = 20.0;
        buttonRadius = 16.0;
        fieldRadius = 14.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.18 : 0.35),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 14,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = scaffoldBg.withOpacity(0.9);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.22 : 0.40),
          width: 1.2,
        );
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF20322D);
        break;

      case AppThemePreset.slate: // Minimalist Charcoal Slate
        seedColor = const Color(0xFF475569);
        scaffoldBg = isLight ? const Color(0xFFF8FAFC) : const Color(0xFF202630);
        cardRadius = 16.0;
        buttonRadius = 12.0;
        fieldRadius = 12.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.18 : 0.35),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 12,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = scaffoldBg.withOpacity(0.9);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.22 : 0.40),
          width: 1.2,
        );
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF2C3442);
        break;

      case AppThemePreset.olive:
      default:
        seedColor = const Color(0xFF5C5F3E);
        scaffoldBg = isLight ? const Color(0xFFF2F1EF) : const Color(0xFF23251E);
        cardRadius = 20.0;
        buttonRadius = 16.0;
        fieldRadius = 14.0;
        cardBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.18 : 0.35),
          width: 1.2,
        );
        cardShadow = [
          BoxShadow(
            color: Colors.black.withOpacity(isLight ? 0.04 : 0.15),
            blurRadius: 14,
            offset: const Offset(0, 6),
          )
        ];
        navBarBg = scaffoldBg.withOpacity(0.9);
        navBarBorder = Border.all(
          color: seedColor.withOpacity(isLight ? 0.22 : 0.40),
          width: 1.2,
        );
        navBarBlur = 10.0;
        navBarActiveColor = seedColor;
        glowColor = seedColor;
        cardBg = isLight ? Colors.white : const Color(0xFF31332B);
        break;
    }

    final Color statusGreen;
    final Color statusYellow;
    final Color statusRed;

    switch (preset) {
      case AppThemePreset.ocean:
        statusGreen = isLight ? const Color(0xFF0D9488) : const Color(0xFF2DD4BF);
        statusYellow = isLight ? const Color(0xFFD97706) : const Color(0xFFFBBF24);
        statusRed = isLight ? const Color(0xFFE11D48) : const Color(0xFFFB7185);
        break;
      case AppThemePreset.sunset:
        statusGreen = isLight ? const Color(0xFF16A34A) : const Color(0xFF4ADE80);
        statusYellow = isLight ? const Color(0xFFCA8A04) : const Color(0xFFFDE047);
        statusRed = isLight ? const Color(0xFFDC2626) : const Color(0xFFF87171);
        break;
      case AppThemePreset.forest:
        statusGreen = isLight ? const Color(0xFF059669) : const Color(0xFF34D399);
        statusYellow = isLight ? const Color(0xFFD97706) : const Color(0xFFFBBF24);
        statusRed = isLight ? const Color(0xFFDC2626) : const Color(0xFFF87171);
        break;
      case AppThemePreset.slate:
        statusGreen = isLight ? const Color(0xFF0F766E) : const Color(0xFF14B8A6);
        statusYellow = isLight ? const Color(0xFFB45309) : const Color(0xFFF59E0B);
        statusRed = isLight ? const Color(0xFFBE123C) : const Color(0xFFF43F5E);
        break;
      case AppThemePreset.olive:
      default:
        statusGreen = isLight ? const Color(0xFF4D7C0F) : const Color(0xFF84CC16);
        statusYellow = isLight ? const Color(0xFFCA8A04) : const Color(0xFFEAB308);
        statusRed = isLight ? const Color(0xFFB91C1C) : const Color(0xFFEF4444);
        break;
    }

    final actualCardBg = cardBg ?? (isLight ? Colors.white : const Color(0xFF1A1A1A));
    final containerHigh = isLight 
        ? const Color(0xFFE5E7EB) 
        : (cardBg != null ? Color.lerp(cardBg, Colors.white, 0.08)! : const Color(0xFF2A2A2A));
    final containerHighest = isLight 
        ? const Color(0xFFD1D5DB) 
        : (cardBg != null ? Color.lerp(cardBg, Colors.white, 0.15)! : const Color(0xFF333333));

    return ThemeData(
      brightness: actualBrightness,
      colorScheme: ColorScheme.fromSeed(
        seedColor: seedColor,
        brightness: actualBrightness,
        primary: seedColor,
        surface: actualCardBg,
      ).copyWith(
        surface: actualCardBg,
        surfaceContainerLowest: isLight ? Colors.white : actualCardBg,
        surfaceContainerLow: isLight ? const Color(0xFFF9FAFB) : scaffoldBg,
        surfaceContainer: isLight ? const Color(0xFFF3F4F6) : actualCardBg,
        surfaceContainerHigh: containerHigh,
        surfaceContainerHighest: containerHighest,
        onSurfaceVariant: isLight ? const Color(0xFF374151) : const Color(0xFFD1D5DB),
        onSurface: isLight ? const Color(0xFF111827) : const Color(0xFFF9FAFB),
        outline: isLight ? seedColor.withOpacity(0.4) : seedColor.withOpacity(0.6),
        outlineVariant: isLight ? Colors.black.withOpacity(0.12) : Colors.white.withOpacity(0.18),
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
          statusGreen: statusGreen,
          statusYellow: statusYellow,
          statusRed: statusRed,
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

