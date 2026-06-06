import 'dart:async';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../../../../../core/errors/api_error.dart';
import '../../../../../../data/models/locker.dart';
import '../../../../../../data/remote/api_client.dart';

/// Screen displaying the user's lockers and locker management options.
class MyLockersScreen extends StatefulWidget {
  const MyLockersScreen({
    super.key,
    required this.client,
    required this.selectedStationId,
  });

  final ApiClient client;
  final String selectedStationId;

  @override
  State<MyLockersScreen> createState() => _MyLockersScreenState();
}

class _MyLockersScreenState extends State<MyLockersScreen> {
  static const _bg = Color(0xFFF6F5F1);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _olive = Color(0xFF5B5A3D);
  static const _successGreen = Color(0xFF42B77A);
  static const _successGreenLight = Color(0xFFE8F6ED);
  static const _errorRed = Color(0xFFE54B4B);

  Locker? _locker;
  bool _loading = true;
  String? _error;
  DateTime? _lastUpdatedAt;
  Timer? _pollTimer;
  bool _lockingUnlocking = false;
  bool _releasing = false;
  String? _actionMessage;
  Color? _actionMessageColor;

  @override
  void initState() {
    super.initState();
    _loadLockerDetails();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      _loadLockerDetails(silent: true);
    });
  }

  @override
  void didUpdateWidget(covariant MyLockersScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.selectedStationId != widget.selectedStationId) {
      _loadLockerDetails();
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLockerDetails({bool silent = false}) async {
    if (widget.selectedStationId.isEmpty) {
      if (!mounted) return;
      setState(() {
        _locker = null;
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
      final locker = await widget.client.fetchReservedLockerDetails(
        widget.selectedStationId,
      );
      if (!mounted) return;
      setState(() {
        _locker = locker;
        _loading = false;
        _error = null;
        _lastUpdatedAt = DateTime.now();
      });
    } catch (error) {
      if (!mounted) return;
      final message = error is ApiError ? error.message : error.toString();
      final noReservation = message.toLowerCase().contains('no reserved locker');

      setState(() {
        _locker = null;
        _loading = false;
        _error = noReservation ? null : message;
        _lastUpdatedAt = DateTime.now();
      });
    }
  }

  /// Custom date formatter to match the UI: "Tue, 19 May 2026 • 14:35"
  String _formatDateTimeDetailed(DateTime? value) {
    if (value == null) return '—';
    final local = value.toLocal();
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    final dayName = days[local.weekday - 1];
    final monthName = months[local.month - 1];
    final hh = local.hour.toString().padLeft(2, '0');
    final mm = local.minute.toString().padLeft(2, '0');
    
    return '$dayName, ${local.day} $monthName ${local.year} • $hh:$mm';
  }

  Future<void> _unlockLocker() async {
    if (_locker == null || _lockingUnlocking) return;
    setState(() {
      _lockingUnlocking = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.unlockLocker(
        stationId: widget.selectedStationId,
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
    setState(() {
      _releasing = true;
      _actionMessage = null;
    });
    try {
      final updatedLocker = await widget.client.requestReleaseLocker(
        stationId: widget.selectedStationId,
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
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: RefreshIndicator(
          color: _olive,
          onRefresh: _loadLockerDetails,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                sliver: SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // ── Custom Header ──────────────────────────────────────────
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: const BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Color(0x0A000000),
                                  blurRadius: 10,
                                  offset: Offset(0, 4),
                                )
                              ],
                            ),
                            child: IconButton(
                              icon: const Icon(Icons.close, color: _text, size: 20),
                              onPressed: () {
                                // Close action or clear selection
                              },
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            decoration: BoxDecoration(
                              color: _successGreenLight,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: _successGreen.withValues(alpha: 0.2)),
                            ),
                            child: const Text(
                              'LIVE CONNECTION',
                              style: TextStyle(
                                color: _successGreen,
                                fontSize: 11,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.0,
                              ),
                            ),
                          ),
                          const SizedBox(width: 48), // Balance the row
                        ],
                      ),
                      const SizedBox(height: 32),

                      if (_loading)
                        const Padding(
                          padding: EdgeInsets.only(top: 100),
                          child: CircularProgressIndicator(strokeWidth: 2, color: _olive),
                        )
                      else if (_error != null)
                        _ErrorCard(error: _error!, onRetry: _loadLockerDetails)
                      else if (_locker == null)
                        const _EmptyCard()
                      else ...[
                        // ── Station Name ───────────────────────────────────────
                        Text(
                          widget.selectedStationId.toUpperCase(),
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            color: _muted,
                            fontSize: 12,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 2.0,
                          ),
                        ),
                        const SizedBox(height: 8),

                        // ── Locker ID ──────────────────────────────────────────
                        Text(
                          'Locker #${_locker!.code}',
                          textAlign: TextAlign.center,
                          style: const TextStyle(
                            fontSize: 42,
                            fontWeight: FontWeight.w900,
                            color: _text,
                            letterSpacing: -1.5,
                          ),
                        ),
                        const SizedBox(height: 32),

                        // ── Locker Content Widget ──────────────────────────────
                        _LockerContent(
                          locker: _locker!,
                          lockingUnlocking: _lockingUnlocking,
                          releasing: _releasing,
                          onUnlock: _unlockLocker,
                          onRelease: _requestReleaseLocker,
                          onRefresh: _loadLockerDetails,
                          formatDateTime: _formatDateTimeDetailed,
                        ),
                        
                        // ── Action Error Display ───────────────────────────────
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
                      ]
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

// ─── Refined Locker Content ──────────────────────────────────────────────────

class _LockerContent extends StatelessWidget {
  const _LockerContent({
    required this.locker,
    required this.lockingUnlocking,
    required this.releasing,
    required this.onUnlock,
    required this.onRelease,
    required this.onRefresh,
    required this.formatDateTime,
  });

  final Locker locker;
  final bool lockingUnlocking;
  final bool releasing;
  final VoidCallback onUnlock;
  final VoidCallback onRelease;
  final VoidCallback onRefresh;
  final String Function(DateTime?) formatDateTime;

  static const _olive = Color(0xFF5B5A3D);
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);
  static const _successGreen = Color(0xFF42B77A);
  static const _errorRed = Color(0xFFE54B4B);

  @override
  Widget build(BuildContext context) {
    final isUnlocked = locker.lockState == 'unlocked';
    final isDoorOpen = locker.doorState == 'open';

    return Column(
      children: [
        // ── Reservation Time Card ────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x05000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              )
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: const BoxDecoration(
                  color: Color(0xFFF2F1ED),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.access_time_filled, color: _olive, size: 24),
              ),
              const SizedBox(width: 16),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'RESERVED AT',
                    style: TextStyle(
                      color: _muted,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    formatDateTime(locker.reservedAt),
                    style: const TextStyle(
                      color: _text,
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        // ── Hardware Sensors Card ────────────────────────────────────────────
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: const [
              BoxShadow(
                color: Color(0x05000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              )
            ],
          ),
          child: Column(
            children: [
              // Lock Status Row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isUnlocked ? _successGreen : _errorRed,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: (isUnlocked ? _successGreen : _errorRed).withValues(alpha: 0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        )
                      ]
                    ),
                    child: Icon(
                      isUnlocked ? Icons.lock_open_rounded : Icons.lock_rounded, 
                      color: Colors.white, 
                      size: 24
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isUnlocked ? 'LOCKER\nUNLOCKED' : 'LOCKER\nLOCKED',
                          style: const TextStyle(
                            color: _text,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Electronic magnetic bolt ${isUnlocked ? 'inactive' : 'active'}',
                          style: const TextStyle(color: _muted, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  CupertinoSwitch(
                    value: isUnlocked,
                    activeColor: _successGreen,
                    onChanged: (value) {
                      if (value && !isUnlocked && !lockingUnlocking) {
                        onUnlock();
                      }
                    },
                  ),
                ],
              ),
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Divider(color: Color(0xFFF2F1ED), height: 1),
              ),
              // Door Status Row
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: const BoxDecoration(
                      color: Color(0xFFF2F1ED),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.power_settings_new_rounded, color: _muted, size: 24),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          isDoorOpen ? 'DOOR\nOPEN' : 'DOOR\nCLOSED',
                          style: const TextStyle(
                            color: _text,
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                            height: 1.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Proximity sensor detection',
                          style: TextStyle(color: _muted, fontSize: 12, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  // Decorative button to match UI (Optional mapping to hardware test)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF2F1ED),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Text(
                      'SIMULATE\nTOGGLE',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: _text,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.5,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 32),

        // ── Action Buttons ───────────────────────────────────────────────────
        SizedBox(
          width: double.infinity,
          height: 56,
          child: OutlinedButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.sync_rounded, color: _text, size: 20),
            label: const Text(
              'DIAGNOSE COMPONENT',
              style: TextStyle(color: _text, fontWeight: FontWeight.w800, letterSpacing: 0.8),
            ),
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Color(0xFFE8E4DC), width: 2),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
          ),
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 56,
          child: FilledButton.icon(
            onPressed: releasing ? null : onRelease,
            icon: releasing 
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.logout_rounded, color: Colors.white, size: 20),
            label: Text(
              releasing ? 'RELEASING...' : 'END SESSION & RELEASE',
              style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.8),
            ),
            style: FilledButton.styleFrom(
              backgroundColor: _errorRed,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              shadowColor: _errorRed.withValues(alpha: 0.5),
              elevation: 8,
            ),
          ),
        ),
        const SizedBox(height: 32),
        const Text(
          'ENCRYPTED SATELLITE HANDSHAKE: ACTIVE',
          style: TextStyle(
            color: Color(0xFFD4D1C9),
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.5,
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }
}

// ─── Error Card ──────────────────────────────────────────────────────────────
class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.error, required this.onRetry});
  final String error;
  final VoidCallback onRetry;
  static const _text = Color(0xFF1F1E1B);
  static const _errorRed = Color(0xFFE54B4B);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: _errorRed, size: 48),
          const SizedBox(height: 16),
          Text(
            error,
            textAlign: TextAlign.center,
            style: const TextStyle(color: _text, fontWeight: FontWeight.w600, fontSize: 14),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: onRetry,
            style: FilledButton.styleFrom(backgroundColor: const Color(0xFF5B5A3D)),
            child: const Text('Retry Connection'),
          ),
        ],
      ),
    );
  }
}

// ─── Empty Card ──────────────────────────────────────────────────────────────
class _EmptyCard extends StatelessWidget {
  const _EmptyCard();
  static const _text = Color(0xFF1F1E1B);
  static const _muted = Color(0xFFA6A39B);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
      ),
      child: const Column(
        children: [
          Icon(Icons.lock_outline_rounded, size: 48, color: _muted),
          SizedBox(height: 16),
          Text(
            'No Active Session',
            style: TextStyle(color: _text, fontSize: 18, fontWeight: FontWeight.w800),
          ),
          SizedBox(height: 8),
          Text(
            'You don\'t have a reserved locker\nat this station.',
            textAlign: TextAlign.center,
            style: TextStyle(color: _muted, fontSize: 13),
          ),
        ],
      ),
    );
  }
}