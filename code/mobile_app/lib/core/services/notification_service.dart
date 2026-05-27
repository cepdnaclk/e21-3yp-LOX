import 'dart:convert';

import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();
  static const AndroidNotificationChannel _highImportanceChannel = AndroidNotificationChannel(
    'high_importance_channel',
    'High Importance Notifications',
    description: 'This channel is used for important notifications.',
    importance: Importance.max,
  );

  final FirebaseMessaging _messaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications = FlutterLocalNotificationsPlugin();
  String? _cachedToken;
  bool _initialized = false;

  Future<void> _requestLocalNotificationPermission() async {
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.requestNotificationsPermission();
  }

  Future<void> _createNotificationChannel() async {
    final androidImplementation = _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();

    await androidImplementation?.createNotificationChannel(_highImportanceChannel);
  }

  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');

    const initializationSettings = InitializationSettings(
      android: androidSettings,
    );

    await _localNotifications.initialize(initializationSettings);
    await _createNotificationChannel();
    await _requestLocalNotificationPermission();
  }

  Future<void> _showForegroundNotification(RemoteMessage message) async {
    final notification = message.notification;
    if (notification == null) {
      return;
    }

    await _localNotifications.show(
      notification.hashCode,
      notification.title,
      notification.body,
      const NotificationDetails(
        android: AndroidNotificationDetails(
          'high_importance_channel',
          'High Importance Notifications',
          channelDescription: 'This channel is used for important notifications.',
          importance: Importance.max,
          priority: Priority.high,
          playSound: true,
        ),
      ),
      payload: jsonEncode(message.data),
    );
  }

  Future<void> initialize() async {
    if (_initialized) {
      return;
    }

    await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      announcement: false,
      carPlay: false,
      criticalAlert: false,
      provisional: false,
    );

    await _messaging.setForegroundNotificationPresentationOptions(
      alert: true,
      badge: true,
      sound: true,
    );

    await _initializeLocalNotifications();

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('Foreground FCM message: ${message.notification?.title ?? ''}');
      debugPrint('Foreground FCM data: ${message.data}');

      _showForegroundNotification(message).catchError((error) {
        debugPrint('Failed to show local foreground notification: $error');
      });
    });

    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('Notification opened app: ${message.messageId}');
    });

    final initialMessage = await _messaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('Initial FCM message: ${initialMessage.messageId}');
    }

    _cachedToken = await _messaging.getToken();
    _messaging.onTokenRefresh.listen((token) {
      _cachedToken = token;
      debugPrint('FCM token refreshed');
    });

    _initialized = true;
  }

  Future<String?> getDeviceToken() async {
    _cachedToken ??= await _messaging.getToken();
    return _cachedToken;
  }

  Future<void> registerTokenWithBackend({
    required String backendBaseUrl,
    required String authToken,
    String? fcmToken,
  }) async {
    final token = fcmToken ?? await getDeviceToken();

    if (token == null || token.isEmpty) {
      throw StateError('FCM token is not available');
    }

    final uri = Uri.parse(
      '${backendBaseUrl.endsWith('/') ? backendBaseUrl.substring(0, backendBaseUrl.length - 1) : backendBaseUrl}/api/notifications/register-token',
    );

    final response = await http.post(
      uri,
      headers: <String, String>{
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $authToken',
      },
      body: jsonEncode(<String, String>{'fcmToken': token}),
    );

    if (response.statusCode >= 400) {
      throw StateError(
        'Failed to register FCM token (${response.statusCode}): ${response.body}',
      );
    }

    debugPrint('FCM token registered successfully');
  }

  Future<void> subscribeAdminToStationTopic({
    required String stationId,
  }) async {
    final topic = 'admin_$stationId';
    await _messaging.subscribeToTopic(topic);
    debugPrint('Subscribed to topic: $topic');
  }
}