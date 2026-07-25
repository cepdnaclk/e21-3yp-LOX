import 'dart:async';
import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/theme_style.dart';
import '../../../../../core/services/biometric_service.dart';
import '../../../../../core/utils/reservation_phase.dart';
import 'free_countdown_badge.dart';

class ActiveLockerCard extends StatefulWidget {
  const ActiveLockerCard({
    super.key,
    required this.locker,
    required this.stationName,
    required this.station,
    required this.client,
    required this.onRefresh,
    required this.onLockerAction,
  });

  final Locker locker;
  final String stationName;
  final Station station;
  final ApiClient client;
  final VoidCallback onRefresh;
  final VoidCallback onLockerAction;

  @override
  State<ActiveLockerCard> createState() => _ActiveLockerCardState();
}

class _ActiveLockerCardState extends State<ActiveLockerCard> {
  bool _busy = false;
  ReservationStatus? _status;
  Timer? _phaseTimer;

  @override
  void initState() {
    super.initState();
    _recomputePhase();
    // Update phase every second for responsive UI
    _phaseTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) _recomputePhase();
    });
  }

  @override
  void didUpdateWidget(ActiveLockerCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    _recomputePhase();
  }

  @override
  void dispose() {
    _phaseTimer?.cancel();
    super.dispose();
  }

  void _recomputePhase() {
    if (!mounted) return;
    setState(() {
      _status = computeReservationStatus(widget.locker, widget.station);
    });
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _runCommand(Future<void> Function() command, String successMsg) async {
    setState(() => _busy = true);
    try {
      await command();
      _show(successMsg);
      widget.onLockerAction();
    } catch (e) {
      _show(e.toString());
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<bool> _showConfirmDialog({
    required String title,
    required String message,
    required String confirmLabel,
    bool isDestructive = false,
  }) async {
    final theme = Theme.of(context);
    final themeStyle = theme.extension<AppThemeStyle>();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(themeStyle?.cardRadius ?? 20),
        ),
        title: Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.w900),
        ),
        content: Text(
          message,
          style: TextStyle(
            fontSize: 15,
            color: theme.brightness == Brightness.dark
                ? Colors.white.withOpacity(0.8)
                : Colors.black.withOpacity(0.8),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              backgroundColor: isDestructive
                  ? (themeStyle?.statusRed ?? Colors.red)
                  : theme.colorScheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(themeStyle?.buttonRadius ?? 16),
              ),
            ),
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return result == true;
  }

  Future<void> _onUnlockPressed() async {
    final confirmed = await _showConfirmDialog(
      title: 'Unlock Locker',
      message: 'Are you sure you want to unlock locker ${widget.locker.code}?',
      confirmLabel: 'Unlock',
    );
    if (!confirmed) return;

    final isEnabled = await BiometricService.instance.isBiometricEnabled();
    if (isEnabled) {
      final authenticated = await BiometricService.instance.authenticate(
        'Confirm your identity to unlock locker ${widget.locker.code}',
      );
      if (!authenticated) {
        _show('Biometric verification failed. Unlock cancelled.');
        return;
      }
    }

    _runCommand(
      () => widget.client.unlockLocker(widget.locker.id),
      'Locker unlocked successfully.',
    );
  }

  Future<void> _onReleasePressed() async {
    final confirmed = await _showConfirmDialog(
      title: 'Release Booking',
      message: 'Are you sure you want to release your booking for locker ${widget.locker.code}? This action cannot be undone and will free the locker for others.',
      confirmLabel: 'Release',
      isDestructive: true,
    );
    if (!confirmed) return;

    _runCommand(
      () => widget.client.releaseLocker(widget.locker.id),
      'Locker reservation released.',
    );
  }

  /// Opens the Stripe overdue checkout URL in the external browser.
  /// When Stripe completes (success or cancel) it deep-links back via
  /// loxapp://payment/?payment=overdue_success which brings the app to
  /// foreground. The HomeScreen's didChangeAppLifecycleState handler
  /// refreshes all data automatically.
  Future<void> _onPayOverduePressed() async {
    setState(() => _busy = true);
    try {
      final result = await widget.client.createOverdueCheckout(widget.locker.id);
      final checkoutUrl = result['checkoutUrl']?.toString() ?? '';
      if (checkoutUrl.isEmpty) throw Exception('No checkout URL received');

      final uri = Uri.parse(checkoutUrl);
      if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
        throw Exception('Could not launch browser for Stripe checkout');
      }
      // Show a dismissible banner while the user is in the browser.
      // The app refreshes automatically when it resumes via deep link.
      if (mounted) {
        _show('Stripe checkout opened. Complete payment and return to the app.');
      }
    } catch (e) {
      _show('Payment error: ${e.toString()}');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lock = widget.locker.lockState;
    final door = widget.locker.doorState;
    final alert = widget.locker.securityAlertActive;
    final phase = _status?.phase;

    final isLocked = lock == 'LOCKED';
    final isClosed = door == 'CLOSED';
    final isOverdue = phase == ReservationPhase.overdue;
    final isOverdueReleased = phase == ReservationPhase.overdueReleased;

    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 22,
      buttonRadius: 16,
      fieldRadius: 14,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
      statusGreen: isDark ? const Color(0xFF84CC16) : const Color(0xFF4D7C0F),
      statusYellow: isDark ? const Color(0xFFEAB308) : const Color(0xFFCA8A04),
      statusRed: isDark ? const Color(0xFFEF4444) : const Color(0xFFB91C1C),
    );

    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);

    // Dynamic Card background color
    final cardBg = themeStyle.cardBg ?? theme.colorScheme.surface;

    // Card border and shadow based on phase and theme settings
    BoxDecoration cardDecoration;
    if (isOverdue) {
      cardDecoration = BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(themeStyle.cardRadius),
        border: Border.all(
          color: const Color(0xFFB42318).withOpacity(0.4),
          width: 1.8,
        ),
        boxShadow: themeStyle.cardShadow,
      );
    } else if (alert) {
      cardDecoration = BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(themeStyle.cardRadius),
        border: Border.all(
          color: const Color(0xFFF8B4B4),
          width: 1.5,
        ),
        boxShadow: themeStyle.cardShadow,
      );
    } else {
      cardDecoration = BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(themeStyle.cardRadius),
        border: themeStyle.cardBorder ?? Border.all(
          color: theme.colorScheme.onSurface.withOpacity(0.08),
          width: 1.0,
        ),
        boxShadow: themeStyle.cardShadow,
      );
    }

    return Container(
      decoration: cardDecoration,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header: Code and Station name
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  decoration: BoxDecoration(
                    color: (isOverdue ? const Color(0xFFB42318) : theme.colorScheme.primary).withOpacity(0.12),
                    borderRadius: BorderRadius.circular(themeStyle.buttonRadius - 4 > 4 ? themeStyle.buttonRadius - 4 : 8),
                  ),
                  child: Text(
                    widget.locker.code,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: isOverdue ? const Color(0xFFB42318) : theme.colorScheme.primary,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'MY ASSIGNED LOCKER',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 1.2,
                          color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                        ),
                      ),
                      Text(
                        widget.stationName,
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w900,
                          color: theme.colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
                if (_busy)
                  SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: theme.colorScheme.primary),
                  ),
              ],
            ),

            const SizedBox(height: 14),

            // Free countdown / overdue badge
            if (widget.locker.reservedAt != null)
              FreeCountdownBadge(
                locker: widget.locker,
                station: widget.station,
              ),

            const SizedBox(height: 14),

            // Telemetry Badges
            Row(
              children: [
                Expanded(
                  child: _buildStateBadge(
                    'LOCK STATE',
                    lock,
                    isLocked ? Icons.lock_outline_rounded : Icons.lock_open_rounded,
                    isLuxuryGreen
                        ? (isLocked ? theme.colorScheme.primary : const Color(0xFFBB8A52))
                        : (isLocked ? theme.colorScheme.primary : const Color(0xFFD97706)),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildStateBadge(
                    'DOOR STATE',
                    door,
                    isClosed ? Icons.sensor_door_outlined : Icons.sensor_door,
                    isLuxuryGreen
                        ? (isClosed ? theme.colorScheme.primary : const Color(0xFFBB8A52))
                        : (isClosed ? theme.colorScheme.primary : const Color(0xFFC95454)),
                  ),
                ),
              ],
            ),

            const Divider(height: 28),

            // --- Action Buttons ---

            // OVERDUE: only show payment button
            if (isOverdue) ...[
              _buildOverduePaySection(themeStyle),
            ]
            // OVERDUE_RELEASED: show unlock + release only
            else if (isOverdueReleased) ...[
              _buildOverdueReleasedSection(themeStyle),
            ]
            // ACTIVE: full controls
            else ...[
              _buildNormalControls(themeStyle),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOverduePaySection(AppThemeStyle themeStyle) {
    final charge = _status?.chargeAmount ?? 0.0;
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    
    // Adaptive Alert Box Colors for Dark/Light Mode
    final alertBg = isLuxuryGreen
        ? const Color(0xFF0C3B2E)
        : (isDark ? const Color(0xFF3B1E1E) : const Color(0xFFFDE8E8));
    final alertBorderColor = isLuxuryGreen
        ? const Color(0xFFFFBA00)
        : (isDark ? const Color(0xFF7F1D1D) : const Color(0xFFF8B4B4));
    final alertTextColor = isLuxuryGreen
        ? const Color(0xFFFFBA00)
        : (isDark ? const Color(0xFFFCA3A3) : const Color(0xFFC81E1E));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: alertBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: alertBorderColor, width: isLuxuryGreen ? 1.5 : 1.0),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Payment Required',
                style: TextStyle(
                  color: alertTextColor,
                  fontWeight: FontWeight.w900,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Your free storage period has expired. Pay the overdue fee to unlock and retrieve your items.',
                style: TextStyle(
                  color: isLuxuryGreen ? const Color(0xFFFFFFFF) : alertTextColor.withOpacity(0.9),
                  fontSize: 12,
                  height: 1.45,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: isLuxuryGreen ? const Color(0xFFFFBA00) : const Color(0xFFB42318),
            foregroundColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          onPressed: _busy ? null : _onPayOverduePressed,
          icon: const Icon(Icons.credit_card_rounded, size: 20),
          label: Text(
            charge > 0 ? 'Pay \$${charge.toStringAsFixed(2)} Overdue Fee' : 'Pay Overdue Fee',
            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'After payment, you will have a grace period to retrieve your items.',
          textAlign: TextAlign.center,
          style: TextStyle(
            fontSize: 11,
            color: isLuxuryGreen
                ? const Color(0xFFBB8A52)
                : Theme.of(context).colorScheme.onSurfaceVariant.withOpacity(0.6),
          ),
        ),
      ],
    );
  }

  Widget _buildOverdueReleasedSection(AppThemeStyle themeStyle) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    
    // Adaptive green alert colors
    final alertBg = isLuxuryGreen
        ? const Color(0xFF0C3B2E)
        : (isDark ? const Color(0xFF064E3B) : const Color(0xFFECFDF5));
    final alertBorderColor = isLuxuryGreen
        ? const Color(0xFF6D9773)
        : (isDark ? const Color(0xFF065F46) : const Color(0xFF6EE7B7));
    final alertTextColor = isLuxuryGreen
        ? const Color(0xFF6D9773)
        : (isDark ? const Color(0xFFA7F3D0) : const Color(0xFF027A48));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: alertBg,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: alertBorderColor, width: isLuxuryGreen ? 1.5 : 1.0),
          ),
          child: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: alertTextColor, size: 20),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Payment confirmed! Unlock your locker and retrieve your items during the grace period.',
                  style: TextStyle(
                    color: isLuxuryGreen ? const Color(0xFFFFFFFF) : alertTextColor,
                    fontWeight: FontWeight.w700,
                    fontSize: 12,
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
                ),
                onPressed: _busy ? null : _onUnlockPressed,
                icon: const Icon(Icons.lock_open, size: 18),
                label: const Text('Unlock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  foregroundColor: isLuxuryGreen ? const Color(0xFFBB8A52) : const Color(0xFFC95454),
                  side: BorderSide(color: isLuxuryGreen ? const Color(0xFFBB8A52) : const Color(0xFFC95454), width: isLuxuryGreen ? 1.5 : 1.0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
                ),
                onPressed: _busy ? null : _onReleasePressed,
                icon: const Icon(Icons.close, size: 18),
                label: const Text('Release', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildNormalControls(AppThemeStyle themeStyle) {
    final theme = Theme.of(context);
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
                ),
                onPressed: _busy ? null : _onUnlockPressed,
                icon: const Icon(Icons.lock_open, size: 18),
                label: const Text('Unlock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  backgroundColor: isLuxuryGreen
                      ? (theme.brightness == Brightness.dark ? const Color(0xFF6D9773) : const Color(0xFF0C3B2E))
                      : (theme.brightness == Brightness.dark
                          ? theme.colorScheme.primaryContainer
                          : theme.colorScheme.primary.withOpacity(0.85)),
                  foregroundColor: isLuxuryGreen
                      ? (theme.brightness == Brightness.dark ? const Color(0xFF0C3B2E) : Colors.white)
                      : (theme.brightness == Brightness.dark
                          ? theme.colorScheme.onPrimaryContainer
                          : Colors.white),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
                ),
                onPressed: _busy
                    ? null
                    : () => _runCommand(
                          () => widget.client.lockLocker(widget.locker.id),
                          'Locker locked successfully.',
                        ),
                icon: const Icon(Icons.lock, size: 18),
                label: const Text('Lock', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        OutlinedButton.icon(
          style: OutlinedButton.styleFrom(
            foregroundColor: isLuxuryGreen ? const Color(0xFFBB8A52) : const Color(0xFFC95454),
            side: BorderSide(color: isLuxuryGreen ? const Color(0xFFBB8A52) : const Color(0xFFC95454), width: isLuxuryGreen ? 1.5 : 1.0),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(themeStyle.buttonRadius)),
          ),
          onPressed: _busy ? null : _onReleasePressed,
          icon: const Icon(Icons.close, size: 18),
          label: const Text('Release Booking', style: TextStyle(fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildStateBadge(String label, String value, IconData icon, Color color) {
    final theme = Theme.of(context);
    final themeStyle = theme.extension<AppThemeStyle>();
    final isLuxuryGreen = themeStyle != null && themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isLuxuryGreen ? const Color(0xFF0C3B2E) : color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isLuxuryGreen ? const Color(0xFFBB8A52) : color.withOpacity(0.18), width: isLuxuryGreen ? 1.5 : 1.0),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                    color: isLuxuryGreen ? const Color(0xFFBB8A52) : color.withOpacity(0.75),
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    color: isLuxuryGreen ? const Color(0xFFFFFFFF) : color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
