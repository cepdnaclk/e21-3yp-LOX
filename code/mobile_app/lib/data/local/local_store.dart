import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../core/constants/app_constants.dart';
import '../models/auth_result.dart';


/// Bundles the last location and locker station the user was looking at.
/// This ensures that when the user opens the app, they are right back where they left off.
class UiPrefs {
  const UiPrefs({
    required this.savedLocation,
    required this.selectedStationId,
  });

  final String savedLocation;
  final String selectedStationId;
}


/// Asynchronous local storage utility for the Smart Locker app.
/// This class abstracts away the details of how we store and retrieve data on the device.
class LocalStore {
  LocalStore._();

  static final ValueNotifier<int> unreadCountNotifier = ValueNotifier<int>(0);

  static Future<void> refreshUnreadCount() async {
    final count = await getUnreadNotificationCount();
    unreadCountNotifier.value = count;
  }

  // Constant variables for shared preferences keys
  static const _keyBaseUrl = 'api_base_url';
  static const _keyToken = 'auth_token';
  static const _keySavedLocation = 'saved_location';
  static const _keySelectedStation = 'selected_station_id';
  static const _keyThemeMode = 'theme_mode';
  static const _keyThemePreset = 'theme_preset';
  static const _keyLocationEnabled = 'location_enabled';

  static Future<BootstrapData> loadBootstrap() async {
    final prefs = await SharedPreferences.getInstance();
    return BootstrapData(
      baseUrl: prefs.getString(_keyBaseUrl) ?? AppConstants.defaultApiBaseUrl,
      token: prefs.getString(_keyToken) ?? '',
    );
  }

  static Future<void> saveBootstrap({
    required String baseUrl,
    required String token,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyBaseUrl, baseUrl);
    await prefs.setString(_keyToken, token);
  }

  static Future<void> clearToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyToken, '');
  }

  static Future<UiPrefs> loadUiPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    return UiPrefs(
      savedLocation: prefs.getString(_keySavedLocation) ?? '',
      selectedStationId: prefs.getString(_keySelectedStation) ?? '',
    );
  }

  static Future<void> saveLocation(String value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySavedLocation, value);
  }

  static Future<void> saveSelectedStation(String stationId) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keySelectedStation, stationId);
  }

  static Future<ThemeMode> loadThemeMode() async {
    final prefs = await SharedPreferences.getInstance();
    final modeStr = prefs.getString(_keyThemeMode) ?? 'light';
    switch (modeStr) {
      case 'dark':
        return ThemeMode.dark;
      case 'system':
        return ThemeMode.system;
      default:
        return ThemeMode.light;
    }
  }

  static Future<void> saveThemeMode(ThemeMode mode) async {
    final prefs = await SharedPreferences.getInstance();
    String modeStr;
    switch (mode) {
      case ThemeMode.dark:
        modeStr = 'dark';
        break;
      case ThemeMode.system:
        modeStr = 'system';
        break;
      default:
        modeStr = 'light';
        break;
    }
    await prefs.setString(_keyThemeMode, modeStr);
  }

  static Future<String> loadThemePreset() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_keyThemePreset) ?? 'olive';
  }

  static Future<void> saveThemePreset(String presetName) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyThemePreset, presetName);
  }

  static const _keyNotifications = 'user_notifications';
  static const _keyDismissedNotifications = 'dismissed_notification_ids';

  /// Returns the set of notification IDs the user has dismissed locally.
  /// Data is preserved in storage; only the visibility is affected.
  static Future<Set<String>> getDismissedNotificationIds() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyDismissedNotifications);
    if (jsonStr == null || jsonStr.isEmpty) return {};
    try {
      final List<dynamic> decoded = json.decode(jsonStr);
      return decoded.map((e) => e.toString()).toSet();
    } catch (_) {
      return {};
    }
  }

  static Future<List<Map<String, dynamic>>> getNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyNotifications);
    if (jsonStr == null || jsonStr.isEmpty) {
      // Pre-populate with premium default notifications
      final defaultList = [
        {
          'id': 'welcome_lox',
          'title': 'Welcome to LOX Smart Locker!',
          'body': 'We are excited to have you on board! Locate locker stations on your Explore map, reserve a locker, and unlock it seamlessly with your phone.',
          'timestamp': DateTime.now().subtract(const Duration(minutes: 5)).toIso8601String(),
          'read': false,
        },
        {
          'id': 'secure_biometrics',
          'title': 'Secure Your Locker with Biometrics',
          'body': 'Did you know you can enable fingerprint or face recognition for fast and secure locker access? Go to Settings to set it up.',
          'timestamp': DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
          'read': false,
        },
        {
          'id': 'welcome_store',
          'title': 'Introducing the LOX Locker Store',
          'body': 'Need extra storage accessories, padlocks, RFID tags, or keycards? Get premium security items delivered directly to your locker. Visit the web app to browse.',
          'timestamp': DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
          'read': false,
        },
      ];
      await prefs.setString(_keyNotifications, json.encode(defaultList));
      return defaultList;
    }
    try {
      final List<dynamic> decoded = json.decode(jsonStr);
      final allNotifs = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      // Filter out dismissed notifications — data stays in storage
      final dismissed = await getDismissedNotificationIds();
      return allNotifs.where((n) => !dismissed.contains(n['id']?.toString())).toList();
    } catch (_) {
      return [];
    }
  }

  static Future<void> addNotification(String title, String body) async {
    final prefs = await SharedPreferences.getInstance();
    // Load raw list (without filtering dismissed) to avoid duplicating entries
    final jsonStr = prefs.getString(_keyNotifications);
    List<Map<String, dynamic>> notifications = [];
    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        final List<dynamic> decoded = json.decode(jsonStr);
        notifications = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      } catch (_) {}
    }
    final newNotif = {
      'id': DateTime.now().millisecondsSinceEpoch.toString(),
      'title': title,
      'body': body,
      'timestamp': DateTime.now().toIso8601String(),
      'read': false,
    };
    notifications.insert(0, newNotif);
    // Keep last 50 notifications
    if (notifications.length > 50) {
      notifications.removeRange(50, notifications.length);
    }
    await prefs.setString(_keyNotifications, json.encode(notifications));
    await refreshUnreadCount();
  }

  /// Adds a notification only if one with the same [dedupeId] does not already exist.
  /// Used for locker status events derived from request history.
  static Future<void> addNotificationIfNew(String dedupeId, String title, String body, DateTime timestamp) async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyNotifications);
    List<Map<String, dynamic>> notifications = [];
    if (jsonStr != null && jsonStr.isNotEmpty) {
      try {
        final List<dynamic> decoded = json.decode(jsonStr);
        notifications = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      } catch (_) {}
    }
    // Dedup check
    if (notifications.any((n) => n['id']?.toString() == dedupeId)) return;
    final newNotif = {
      'id': dedupeId,
      'title': title,
      'body': body,
      'timestamp': timestamp.toIso8601String(),
      'read': false,
    };
    notifications.insert(0, newNotif);
    if (notifications.length > 50) {
      notifications.removeRange(50, notifications.length);
    }
    await prefs.setString(_keyNotifications, json.encode(notifications));
    await refreshUnreadCount();
  }

  /// Dismisses a single notification by ID.
  /// The underlying data is kept in storage; it is only hidden from the user's view.
  static Future<void> dismissNotification(String id) async {
    final prefs = await SharedPreferences.getInstance();
    final dismissed = await getDismissedNotificationIds();
    dismissed.add(id);
    await prefs.setString(_keyDismissedNotifications, json.encode(dismissed.toList()));
    await refreshUnreadCount();
  }

  /// Dismisses ALL current notifications.
  /// Data is preserved in storage; only the user's visibility is affected.
  static Future<void> dismissAllNotifications() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyNotifications);
    if (jsonStr == null || jsonStr.isEmpty) return;
    try {
      final List<dynamic> decoded = json.decode(jsonStr);
      final allIds = decoded
          .map((e) => Map<String, dynamic>.from(e)['id']?.toString())
          .whereType<String>()
          .toSet();
      final dismissed = await getDismissedNotificationIds();
      dismissed.addAll(allIds);
      await prefs.setString(_keyDismissedNotifications, json.encode(dismissed.toList()));
      await refreshUnreadCount();
    } catch (_) {}
  }

  static Future<int> getUnreadNotificationCount() async {
    final list = await getNotifications();
    return list.where((item) => item['read'] == false).length;
  }

  static Future<void> markAllNotificationsAsRead() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonStr = prefs.getString(_keyNotifications);
    if (jsonStr == null || jsonStr.isEmpty) return;
    try {
      final List<dynamic> decoded = json.decode(jsonStr);
      final list = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
      for (var item in list) {
        item['read'] = true;
      }
      await prefs.setString(_keyNotifications, json.encode(list));
      await refreshUnreadCount();
    } catch (_) {}
  }

  /// Legacy alias — now forwards to [dismissAllNotifications] so data is preserved.
  static Future<void> clearNotifications() async {
    await dismissAllNotifications();
  }

  static Future<bool> isLocationEnabled() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyLocationEnabled) ?? true;
  }

  static Future<void> setLocationEnabled(bool enabled) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLocationEnabled, enabled);
  }
}