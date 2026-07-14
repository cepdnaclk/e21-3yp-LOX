import 'package:flutter/material.dart';

import '../../../../../core/extensions/string_extensions.dart';
import '../../../../../data/local/local_store.dart';
import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../widgets/active_locker_card.dart';

class RequestsScreen extends StatelessWidget {
  const RequestsScreen({
    super.key,
    required this.requests,
    required this.stations,
    required this.client,
    required this.user,
    required this.lockersByStation,
    required this.onRefresh,
    required this.onLockerAction,
  });

  final List<AccessRequest> requests;
  final List<Station> stations;
  final ApiClient client;
  final UserProfile user;
  final Map<String, List<Locker>> lockersByStation;
  final Future<void> Function() onRefresh;
  final Future<void> Function([String?]) onLockerAction;

  Locker? _findLockerForRequest(AccessRequest r) {
    if (r.lockerId.isEmpty) return null;
    final lockers = lockersByStation[r.stationId];
    if (lockers == null) return null;
    try {
      return lockers.firstWhere((l) => l.id == r.lockerId);
    } catch (_) {
      return null;
    }
  }

  /// Injects locker status history events into the notification system.
  /// Each request generates at most one notification, identified by a dedup key.
  Future<void> _injectHistoryNotifications(List<AccessRequest> historyRequests, Map<String, Station> stationMap) async {
    for (final request in historyRequests) {
      final stationName = stationMap[request.stationId]?.name ?? request.stationName.ifEmpty('a station');
      final ts = request.createdAt ?? DateTime.now();

      String title;
      String body;

      switch (request.status) {
        case 'APPROVED':
          if (request.lockerCode.isNotEmpty) {
            title = 'Locker Assigned – ${request.lockerCode}';
            body = 'You were assigned locker ${request.lockerCode} at $stationName.';
          } else {
            title = 'Booking Approved';
            body = 'Your booking request at $stationName was approved.';
          }
          break;
        case 'REJECTED':
          title = 'Booking Rejected';
          body = 'Your booking request at $stationName was rejected.${request.note.isNotEmpty ? " Note: ${request.note}" : ""}';
          break;
        case 'CANCELLED':
          title = 'Booking Cancelled';
          body = 'Your booking at $stationName was cancelled.';
          break;
        case 'QUEUED':
          title = 'Added to Queue';
          body = 'Your request at $stationName is queued. You will be notified when a locker becomes available.';
          break;
        case 'PENDING':
          title = 'Booking Pending';
          body = 'Your booking request at $stationName is pending review.';
          break;
        default:
          continue;
      }

      // Dedup key: requestId + status ensures one notification per status event
      final dedupeId = 'req_${request.id}_${request.status}';
      await LocalStore.addNotificationIfNew(dedupeId, title, body, ts);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stationMap = {for (final s in stations) s.id: s};

    // Find user's active APPROVED request to control
    AccessRequest? activeRequest;
    Locker? activeLocker;
    for (final r in requests) {
      if (r.status == 'APPROVED') {
        final l = _findLockerForRequest(r);
        if (l != null &&
            l.isBooked &&
            (l.currentUserId == user.id || l.activeRequestId == r.id)) {
          activeRequest = r;
          activeLocker = l;
          break;
        }
      }
    }

    // All requests that are NOT the currently-active one are treated as history
    final historyRequests = requests.where((r) => r.id != activeRequest?.id).toList();

    // Inject history items into notifications (fire-and-forget; deduped)
    _injectHistoryNotifications(historyRequests, stationMap);

    final theme = Theme.of(context);

    if (requests.isEmpty) {
      return Scaffold(
        backgroundColor: Colors.transparent,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          title: Text(
            'My Bookings',
            style: TextStyle(
              fontWeight: FontWeight.w900,
              color: theme.colorScheme.onSurface,
            ),
          ),
        ),
        body: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            children: [
              const SizedBox(height: 120),
              Icon(Icons.bookmark_border, size: 64, color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5)),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  'No locker requests yet.',
                  style: TextStyle(
                    fontWeight: FontWeight.w700,
                    color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                  ),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'My Bookings',
          style: TextStyle(
            fontWeight: FontWeight.w900,
            color: theme.colorScheme.onSurface,
          ),
        ),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: onRefresh,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 180),
            children: [
              // Active locker control card (if any)
              if (activeLocker != null && activeRequest != null) ...[
                ActiveLockerCard(
                  locker: activeLocker,
                  stationName:
                      stationMap[activeRequest.stationId]?.name ??
                      activeRequest.stationName.ifEmpty('Station'),
                  station:
                      stationMap[activeRequest.stationId] ??
                      Station(
                        id: activeRequest.stationId,
                        name: activeRequest.stationName.ifEmpty('Station'),
                        code: '',
                        timezone: 'Asia/Colombo',
                        openTime: '08:00',
                        closeTime: '20:00',
                        scheduleEnabled: true,
                        emergencyMode: false,
                      ),
                  client: client,
                  onRefresh: onRefresh,
                  onLockerAction: () => onLockerAction(activeRequest!.stationId),
                ),
                const SizedBox(height: 20),
              ],

              // If no active booking, show a helpful note directing to notifications
              if (activeLocker == null) ...[
                Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 60),
                    child: Column(
                      children: [
                        Icon(Icons.bookmark_border, size: 64, color: theme.colorScheme.onSurfaceVariant.withOpacity(0.3)),
                        const SizedBox(height: 12),
                        Text(
                          'No active booking',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Past booking history is available\nin the Notifications page.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
