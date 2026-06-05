import 'dart:async';
import 'package:flutter/material.dart';

import '../../../../../../core/errors/api_error.dart';
import '../../../../../../core/services/notification_service.dart';
import '../../../../../../data/models/locker.dart';
import '../../../../../../data/models/station.dart';
import '../../../../../../data/remote/api_client.dart';
import '../widgets/empty_card.dart';
import '../widgets/error_card.dart';
import '../widgets/live_indicator.dart';
import '../widgets/locker_content.dart';

/// Screen displaying the user's lockers and locker management options.
class MyLockersScreen extends StatefulWidget {
  const MyLockersScreen({
    super.key,
    required this.client,
    required this.selectedStationId,
    required this.stations,
    required this.onStationResolved,
  });

  final ApiClient client;
  final String selectedStationId;
  final List<Station> stations;
  final ValueChanged<String> onStationResolved;

  @override
  State<MyLockersScreen> createState() => _MyLockersScreenState();
}

class _MyLockersScreenState extends State<MyLockersScreen> {
  static const _bg = Color(0xFFF6F5F1);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _olive = Color(0xFF5B5A3D);
  // static const _successGreen = Color(0xFF42B77A);
  // static const _successGreenLight = Color(0xFFE8F6ED);
  static const _errorRed = Color(0xFFE54B4B);

  Locker? _locker;
  DateTime? _freeLimitEndsAt;
  String? _activeStationId;
  bool _loading = true;
  String? _error;
  Timer? _pollTimer;
  Timer? _clockTimer;
  bool _lockingUnlocking = false;
  bool _releasing = false;
  bool _paying = false;
  String? _actionMessage;
  Color? _actionMessageColor;

  @override
  void initState() {
    super.initState();
    _loadLockerDetails();
    _pollTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      _loadLockerDetails(silent: true);
    });
    _clockTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _locker != null) {
        setState(() {});
      }
    });
  }

  @override
  void didUpdateWidget(covariant MyLockersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedStationId != widget.selectedStationId ||
        oldWidget.stations != widget.stations) {
      _loadLockerDetails();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _clockTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLockerDetails({bool silent = false}) async {
    final candidateStationIds = <String>{
      if (widget.selectedStationId.isNotEmpty) widget.selectedStationId,
      ...widget.stations.map((station) => station.id),
    }.toList();

    if (candidateStationIds.isEmpty) {
      if (!mounted) return;
      setState(() {
        _locker = null;
        _freeLimitEndsAt = null;
        _activeStationId = null;
        _loading = false;
        _error = 'No station selected yet.';
      });
      return;
    }

    if (!silent) {
      setState(() {
        _loading = true;
        _error = null;
      });
    }

    try {
      Locker? locker;
      DateTime? freeLimitEndsAt;
      String? resolvedStationId;

      for (final stationId in candidateStationIds) {
        try {
          final candidateLocker = await widget.client.fetchReservedLockerDetails(
            stationId,
          );
          resolvedStationId = stationId;
          locker = candidateLocker;

          try {
            final timingPayload = await widget.client.fetchLockerTimeRemaining(
              stationId,
            );
            if (timingPayload['time_limit'] == true) {
              final expiresAt = DateTime.tryParse(
                timingPayload['expires_at']?.toString() ?? '',
              );

              if (expiresAt != null) {
                freeLimitEndsAt = expiresAt;
              } else {
                final reservedAt = DateTime.tryParse(
                  timingPayload['reserved_at']?.toString() ?? '',
                );
                final freeMinutes = int.tryParse(
                  timingPayload['free_minutes']?.toString() ?? '',
                );

                if (reservedAt != null && freeMinutes != null) {
                  freeLimitEndsAt = reservedAt.add(Duration(minutes: freeMinutes));
                }
              }
            }
          } catch (_) {
            freeLimitEndsAt = null;
          }
          break;
        } catch (error) {
          final message = error is ApiError
              ? error.message.toLowerCase()
              : error.toString().toLowerCase();
          if (message.contains('no reserved locker') ||
              message.contains('access denied')) {
            continue;
          }
          rethrow;
        }
      }

      if (!mounted) return;
      if (locker == null || resolvedStationId == null) {
        setState(() {
          _locker = null;
          _freeLimitEndsAt = null;
          _activeStationId = null;
          _loading = false;
          _error = null;
        });
        return;
      }

      setState(() {
        _locker = locker;
        _freeLimitEndsAt = freeLimitEndsAt;
        _activeStationId = resolvedStationId;
        _loading = false;
        _error = null;
      });

      unawaited(_syncLockerReminder(
        stationId: resolvedStationId,
        locker: locker,
        freeLimitEndsAt: freeLimitEndsAt,
      ));

      if (resolvedStationId != widget.selectedStationId) {
        widget.onStationResolved(resolvedStationId);
      }
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _locker = null;
        _freeLimitEndsAt = null;
        _activeStationId = null;
        _loading = false;
        _error = message.toLowerCase().contains('no reserved locker') ? null : message;
      });
    }
  }

  Future<void> _syncLockerReminder({
    required String stationId,
    required Locker locker,
    required DateTime? freeLimitEndsAt,
  }) async {
    final reminderTarget = locker.paymentStatus == 'paid'
        ? locker.gracePeriodExpiresAt
        : freeLimitEndsAt;

    if (reminderTarget == null || locker.availability != 'reserved') {
      await NotificationService.instance.cancelLockerReminder(
        stationId: stationId,
        lockerId: locker.id,
      );
      return;
    }

    if (locker.paymentStatus == 'paid') {
      await NotificationService.instance.cancelLockerReminder(
        stationId: stationId,
        lockerId: locker.id,
      );
      return;
    }

    await NotificationService.instance.scheduleLockerReminder(
      stationId: stationId,
      lockerId: locker.id,
      expiresAt: reminderTarget,
    );
  }

  bool _requiresOverduePayment() {
    final locker = _locker;
    if (locker == null || locker.paymentStatus == 'paid') {
      return false;
    }

    final dueAt = _freeLimitEndsAt;
    if (locker.availability == 'overdue') {
      return true;
    }

    return dueAt != null && DateTime.now().isAfter(dueAt);
  }

  bool _isGracePeriodActive() {
    final locker = _locker;
    final gracePeriodEndsAt = locker?.gracePeriodExpiresAt;
    return locker?.paymentStatus == 'paid' &&
        gracePeriodEndsAt != null &&
        DateTime.now().isBefore(gracePeriodEndsAt);
  }

  DateTime? _currentDueAt() {
    final locker = _locker;
    if (locker?.paymentStatus == 'paid') {
      return locker?.gracePeriodExpiresAt;
    }

    return _freeLimitEndsAt;
  }
  /// Custom date formatter to match the UI: "Tue, 19 May 2026 • 14:35"
  String _formatDateTimeDetailed(DateTime? value) {
    if (value == null) return '—';
    final local = value.toLocal();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    final dayName = days[local.weekday - 1];
    final monthName = months[local.month - 1];
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');

    return '$dayName, ${local.day} $monthName ${local.year} • $hh:$mm';
  }

  String _formatDuration(Duration duration) {
    final safeDuration = duration.isNegative ? Duration.zero : duration;
    final hours = safeDuration.inHours;
    final minutes = safeDuration.inMinutes.remainder(60);
    final seconds = safeDuration.inSeconds.remainder(60);

    if (hours > 0) {
      return '${hours}h ${minutes.toString().padLeft(2, '0')}m';
    }

    return '${minutes}m ${seconds.toString().padLeft(2, '0')}s';
  }

  Future<void> _unlockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;

    if (_requiresOverduePayment()) {
      setState(() {
        _actionMessage = 'Pay the overdue fee first to unlock this locker.';
        _actionMessageColor = _errorRed;
      });
      return;
    }

    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.unlockLocker(
        stationId: stationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _lockingUnlocking = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _lockingUnlocking = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  Future<void> _payOverdueLocker({
    required String cardHolderName,
    required String cardNumber,
    required String expiryMonthYear,
    required String cvv,
  }) async {
    if (_locker == null || _paying) return;
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;

    setState(() {
      _paying = true;
      _actionMessage = null;
    });

    try {
      final updatedLocker = await widget.client.payOverdueLocker(
        stationId: stationId,
        lockerId: _locker!.id,
        cardHolderName: cardHolderName,
        cardNumber: cardNumber,
        expiryMonthYear: expiryMonthYear,
        cvv: cvv,
      );

      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _freeLimitEndsAt = null;
        _paying = false;
        _actionMessage = 'Payment done. You have 30 minutes to retrieve your items.';
        _actionMessageColor = _olive;
      });

      await NotificationService.instance.cancelLockerReminder(
        stationId: stationId,
        lockerId: _locker!.id,
      );

      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _paying = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  Future<void> _showPaymentSheet() async {
    if (_locker == null || _paying) return;

    final formKey = GlobalKey<FormState>();
    String cardHolderName = 'Test User';
    String cardNumber = '4242 4242 4242 4242';
    String expiryMonthYear = '12/28';
    String cvv = '123';

    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Padding(
              padding: EdgeInsets.fromLTRB(
                24,
                8,
                24,
                24 + MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Form(
                key: formKey,
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Mock overdue payment',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: _text,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Locker ${_locker!.code} is overdue. Enter sandbox card details to open a 30-minute grace period.',
                        style: const TextStyle(
                          fontSize: 14,
                          height: 1.4,
                          color: _muted,
                        ),
                      ),
                      const SizedBox(height: 16),
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8F7F3),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: const Color(0xFFE7E3D9)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Sandbox fee',
                              style: TextStyle(
                                fontWeight: FontWeight.w700,
                                color: _text,
                              ),
                            ),
                            Text(
                              '\$5.00',
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                color: _olive,
                                fontSize: 18,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        initialValue: cardHolderName,
                        decoration: const InputDecoration(
                          labelText: 'Card holder name',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => cardHolderName = value,
                        validator: (value) =>
                            value == null || value.trim().isEmpty ? 'Enter the card holder name' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        initialValue: cardNumber,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Card number',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (value) => cardNumber = value,
                        validator: (value) {
                          final digits = value?.replaceAll(RegExp(r'\s+'), '') ?? '';
                          return digits.length < 12 ? 'Enter a valid card number' : null;
                        },
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: expiryMonthYear,
                              decoration: const InputDecoration(
                                labelText: 'Expiry MM/YY',
                                border: OutlineInputBorder(),
                              ),
                              onChanged: (value) => expiryMonthYear = value,
                              validator: (value) =>
                                  value == null || !RegExp(r'^\d{2}/\d{2}$').hasMatch(value.trim())
                                      ? 'Use MM/YY'
                                      : null,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: TextFormField(
                              initialValue: cvv,
                              keyboardType: TextInputType.number,
                              decoration: const InputDecoration(
                                labelText: 'CVV',
                                border: OutlineInputBorder(),
                              ),
                              onChanged: (value) => cvv = value,
                              validator: (value) =>
                                  value == null || !RegExp(r'^\d{3,4}$').hasMatch(value.trim())
                                      ? 'Invalid CVV'
                                      : null,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),
                      SizedBox(
                        height: 54,
                        child: FilledButton.icon(
                          onPressed: _paying
                              ? null
                              : () async {
                                  if (!(formKey.currentState?.validate() ?? false)) {
                                    return;
                                  }
                                  Navigator.of(context).pop();
                                  await _payOverdueLocker(
                                    cardHolderName: cardHolderName,
                                    cardNumber: cardNumber,
                                    expiryMonthYear: expiryMonthYear,
                                    cvv: cvv,
                                  );
                                },
                          icon: _paying
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : const Icon(Icons.credit_card_rounded, color: Colors.white),
                          label: const Text(
                            'PAY NOW',
                            style: TextStyle(fontWeight: FontWeight.w800),
                          ),
                          style: FilledButton.styleFrom(
                            backgroundColor: _olive,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Future<void> _lockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.lockLocker(
        stationId: stationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _lockingUnlocking = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _lockingUnlocking = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  Future<void> _requestReleaseLocker() async {
    if (_locker == null || _releasing) return;
    final stationId = _activeStationId ?? widget.selectedStationId;
    if (stationId.isEmpty) return;

    if (_requiresOverduePayment()) {
      setState(() {
        _actionMessage = 'Pay the overdue fee first to release this locker.';
        _actionMessageColor = _errorRed;
      });
      return;
    }

    setState(() {
      _releasing = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.requestReleaseLocker(
        stationId: stationId,
        lockerId: _locker!.id,
      );
      if (!mounted) return;
      setState(() {
        _locker = updatedLocker;
        _releasing = false;
      });
      Future.delayed(const Duration(milliseconds: 500), () {
        if (mounted) _loadLockerDetails(silent: true);
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      setState(() {
        _releasing = false;
        _actionMessage = message;
        _actionMessageColor = _errorRed;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final freeLimitEndsAt = _currentDueAt();
    final stationLabel = (_activeStationId ?? widget.selectedStationId).toUpperCase();
    final gracePeriodEndsAt = _locker?.gracePeriodExpiresAt;

    final bool gracePeriodActive = _isGracePeriodActive();
    
    // Logic to determine timing state
    final bool hasLimit = freeLimitEndsAt != null || gracePeriodEndsAt != null;
    final bool isOverdue = _requiresOverduePayment();

    String timingLabel;
    String timingValue;
    String timingSubtext;
    Color timingColor;
    IconData timingIcon;

    if (!hasLimit) {
      timingLabel = 'ACCESS STATUS';
      timingValue = 'UNLIMITED';
      timingSubtext = 'No time limit for this station';
      timingColor = _olive;
      timingIcon = Icons.lock_clock_rounded;
    } else if (gracePeriodActive) {
      timingLabel = 'GRACE PERIOD LEFT';
      timingValue = _formatDuration(gracePeriodEndsAt!.difference(now));
      timingSubtext = 'Ends at ${_formatDateTimeDetailed(gracePeriodEndsAt)}';
      timingColor = _olive;
      timingIcon = Icons.receipt_long_rounded;
    } else if (isOverdue) {
      timingLabel = 'PAYMENT REQUIRED';
      timingValue = 'OVERDUE';
      timingSubtext = freeLimitEndsAt != null
          ? 'Overdue by ${_formatDuration(now.difference(freeLimitEndsAt))}'
          : 'Pay to unlock a 30-minute grace period';
      timingColor = _errorRed;
      timingIcon = Icons.timer_off_rounded;
    } else {
      timingLabel = 'FREE TIME LEFT';
      timingValue = _formatDuration(freeLimitEndsAt!.difference(now));
      timingSubtext = 'Ends at ${_formatDateTimeDetailed(freeLimitEndsAt)}';
      timingColor = _olive;
      timingIcon = Icons.hourglass_top_rounded;
    }

    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: _olive,
          onRefresh: _loadLockerDetails,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverFillRemaining(
                hasScrollBody:
                    false,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 24,
                    vertical: 16,
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      if (_loading)
                        const CircularProgressIndicator(
                          strokeWidth: 2,
                          color: _olive,
                        )
                      else if (_error != null)
                        ErrorCard(error: _error!, onRetry: _loadLockerDetails)
                      else if (_locker == null)
                        const EmptyCard()
                      else ...[
                        // Custom Header
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [const LiveIndicator()],
                        ),
                        const SizedBox(height: 32),

                        // Station Name
                        Text(
                          stationLabel,
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: _muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2.0,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Locker ID
                        Text(
                          'Locker ${_locker!.code}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: _text,
                            letterSpacing: -1.5,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // Locker Content Widget
                        LockerContent(
                          locker: _locker!,
                          lockingUnlocking: _lockingUnlocking,
                          releasing: _releasing,
                          onUnlock: _unlockLocker,
                          onLock: _lockLocker,
                          onRelease: _requestReleaseLocker,
                          formatDateTime: _formatDateTimeDetailed,
                          timingLabel: timingLabel,
                          timingValue: timingValue,
                          timingSubtext: timingSubtext,
                            timingColor: timingColor,
                            timingIcon: timingIcon,
                        ),

                        if (_requiresOverduePayment()) ...[
                          const SizedBox(height: 20),
                          SizedBox(
                            width: double.infinity,
                            height: 54,
                            child: FilledButton.icon(
                              onPressed: _paying ? null : _showPaymentSheet,
                              icon: _paying
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                        color: Colors.white,
                                      ),
                                    )
                                  : const Icon(
                                      Icons.credit_card_rounded,
                                      color: Colors.white,
                                      size: 20,
                                    ),
                              label: Text(
                                _paying ? 'PROCESSING PAYMENT...' : 'PAY OVERDUE FEE',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 0.8,
                                ),
                              ),
                              style: FilledButton.styleFrom(
                                backgroundColor: _olive,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                              ),
                            ),
                          ),
                        ],

                        if (gracePeriodActive) ...[
                          const SizedBox(height: 16),
                          Text(
                            'Grace period active until ${_formatDateTimeDetailed(gracePeriodEndsAt)}',
                            style: const TextStyle(
                              color: _olive,
                              fontWeight: FontWeight.w700,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],

                        // Action Error Display
                        if (_actionMessage != null) ...[
                          const SizedBox(height: 16),
                          Text(
                            _actionMessage!,
                            style: TextStyle(
                              color: _actionMessageColor,
                              fontWeight: FontWeight.w600,
                              fontSize: 13,
                            ),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
