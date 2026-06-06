import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:mobile_app/app/app.dart';
import 'package:mobile_app/data/models/access_request.dart';
import 'package:mobile_app/data/models/locker.dart';
import 'package:mobile_app/data/models/station.dart';
import 'package:mobile_app/data/models/session_data.dart';
import 'package:mobile_app/data/models/user_profile.dart';
import 'package:mobile_app/data/remote/api_client.dart';
import 'package:mobile_app/features/auth/screens/auth_screen.dart';
import 'package:mobile_app/features/auth/screens/login_screen.dart';
import 'package:mobile_app/features/home/screens/home_screen.dart';

class FakeApiClient extends ApiClient {
  FakeApiClient()
      : super(baseUrl: 'http://example.com/api', token: 'token');

  @override
  Future<List<Station>> fetchStations() async => const [];

  @override
  Future<List<Locker>> fetchLockers(String stationId) async => const [];

  @override
  Future<List<AccessRequest>> fetchRequests() async => const [];
}

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('SmartLockerApp shows auth flow when no session exists', (
    WidgetTester tester,
  ) async {
    print('Running widget test: SmartLockerApp shows auth flow when no session exists');
    await tester.pumpWidget(const SmartLockerApp());
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('SIGN IN'), findsOneWidget);
  });

  testWidgets('AuthScreen switches from login to register', (
    WidgetTester tester,
  ) async {
    print('Running widget test: AuthScreen switches from login to register');
    await tester.pumpWidget(
      MaterialApp(
        home: AuthScreen(onAuthSuccess: (_) async {}),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Welcome Back'), findsOneWidget);
    expect(find.text('Create Account'), findsNothing);

    await tester.tap(find.text('JOIN'));
    await tester.pumpAndSettle();

    expect(find.text('Create Account'), findsOneWidget);
    expect(find.text('Welcome Back'), findsNothing);
  });

  testWidgets('LoginScreen shows validation error for empty input', (
    WidgetTester tester,
  ) async {
    print('Running widget test: LoginScreen shows validation error for empty input');
    await tester.pumpWidget(
      MaterialApp(
        home: LoginScreen(
          onAuthSuccess: (_) async {},
          showTabToggle: false,
        ),
      ),
    );
    await tester.pumpAndSettle();

    await tester.tap(find.text('SIGN IN'));
    await tester.pump();

    expect(find.text('Email and password are required.'), findsOneWidget);
  });

  testWidgets('HomeScreen loads empty state and profile content', (
    WidgetTester tester,
  ) async {
    print('Running widget test: HomeScreen loads empty state and profile content');
    final session = UserProfile(
      id: 'user-1',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      role: 'Member',
    );

    await tester.pumpWidget(
      MaterialApp(
        home: HomeScreen(
          session: SessionData(client: FakeApiClient(), user: session),
          onLogout: () async {},
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('No stations found.'), findsOneWidget);

    await tester.tap(find.text('Bookings'));
    await tester.pumpAndSettle();
    expect(find.text('No locker requests yet.'), findsOneWidget);

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('Alex Johnson'), findsOneWidget);
    expect(find.text('Logout'), findsOneWidget);
  });
}