import 'package:flutter/material.dart';
import '../../../data/models/auth_result.dart';
import 'welcome_screen.dart';
import 'login_screen.dart';
import 'register_screen.dart';

/// The entry point for all authentication-related flows.
///
/// Manages the state between [WelcomeScreen], [LoginScreen], and [RegisterScreen] 
/// using a PageView with smooth transition animations.

class AuthScreen extends StatefulWidget {
  const AuthScreen({
    super.key,
    required this.onAuthSuccess,
    this.errorMessage,
    this.initialTab = 0,
  });

  final Future<void> Function(AuthResult result) onAuthSuccess;
  final String? errorMessage;
  final int initialTab;

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final GlobalKey<NavigatorState> _navigatorKey = GlobalKey<NavigatorState>();

  String _getInitialRoute() {
    if (widget.initialTab == 1) return 'login';
    if (widget.initialTab == 2) return 'register';
    return 'welcome';
  }

  @override
  Widget build(BuildContext context) {
    return Navigator(
      key: _navigatorKey,
      initialRoute: _getInitialRoute(),
      onGenerateRoute: (RouteSettings settings) {
        WidgetBuilder builder;
        switch (settings.name) {
          case 'welcome':
            builder = (context) => WelcomeScreen(
                  onLoginTap: () => Navigator.of(context).pushNamed('login'),
                  onRegisterTap: () => Navigator.of(context).pushNamed('register'),
                );
            break;
          case 'login':
            builder = (context) => LoginScreen(
                  onAuthSuccess: widget.onAuthSuccess,
                  errorMessage: widget.errorMessage,
                  onJoinTap: () => Navigator.of(context).pushReplacementNamed('register'),
                  onBackTap: () => Navigator.of(context).maybePop(),
                );
            break;
          case 'register':
            builder = (context) => RegisterScreen(
                  onAuthSuccess: widget.onAuthSuccess,
                  onLoginTap: () => Navigator.of(context).pushReplacementNamed('login'),
                  onBackTap: () => Navigator.of(context).maybePop(),
                );
            break;
          default:
            throw Exception('Invalid route: ${settings.name}');
        }
        return MaterialPageRoute(
          builder: builder,
          settings: settings,
        );
      },
    );
  }
}
