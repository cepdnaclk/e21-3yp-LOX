import 'dart:async';
import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../core/utils/reservation_phase.dart';
import '../../../../../core/theme/app_colors.dart';
import '../../../../../core/theme/theme_style.dart';

/// A self-updating widget that shows the reservation phase as a colored badge.
/// Ticks every second as long as it's mounted.
class FreeCountdownBadge extends StatefulWidget {
  const FreeCountdownBadge({
    super.key,
    required this.locker,
    required this.station,
  });

  final Locker locker;
  final Station station;

  @override
  State<FreeCountdownBadge> createState() => _FreeCountdownBadgeState();
}

class _FreeCountdownBadgeState extends State<FreeCountdownBadge> {
  late Timer _timer;
  late ReservationStatus _status;

  @override
  void initState() {
    super.initState();
    _status = computeReservationStatus(widget.locker, widget.station);
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _status = computeReservationStatus(widget.locker, widget.station);
        });
      }
    });
  }

  @override
  void didUpdateWidget(FreeCountdownBadge oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Immediately recompute if the locker/station data changed (e.g., after refresh)
    _status = computeReservationStatus(widget.locker, widget.station);
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 16,
      buttonRadius: 12,
      fieldRadius: 12,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
      statusGreen: isDark ? const Color(0xFF84CC16) : const Color(0xFF4D7C0F),
      statusYellow: isDark ? const Color(0xFFEAB308) : const Color(0xFFCA8A04),
      statusRed: isDark ? const Color(0xFFEF4444) : const Color(0xFFB91C1C),
    );
    return _buildBadge(themeStyle);
  }

  Widget _buildBadge(AppThemeStyle themeStyle) {
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    switch (_status.phase) {
      case ReservationPhase.active:
        return _badge(
          color: isLuxuryGreen ? const Color(0xFF6D9773) : const Color(0xFF027A48),
          bgColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : const Color(0xFF027A48),
          icon: Icons.timer_outlined,
          label: 'FREE TIME REMAINING',
          value: formatCountdown(_status.timeRemainingMs),
          themeStyle: themeStyle,
        );

      case ReservationPhase.overdue:
        return _pulseBadge(
          color: isLuxuryGreen ? const Color(0xFFFFBA00) : const Color(0xFFB42318),
          bgColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : const Color(0xFFB42318),
          icon: Icons.warning_amber_rounded,
          label: 'OVERDUE',
          value: formatOverdueDuration(_status.overdueMs),
          subtext: 'Fee: \$${_status.chargeAmount.toStringAsFixed(2)}',
          themeStyle: themeStyle,
        );

      case ReservationPhase.overdueReleased:
        return _badge(
          color: isLuxuryGreen ? const Color(0xFFBB8A52) : Theme.of(context).colorScheme.primary,
          bgColor: isLuxuryGreen ? const Color(0xFF0C3B2E) : Theme.of(context).colorScheme.primary,
          icon: Icons.check_circle_outline_rounded,
          label: 'GRACE PERIOD',
          value: formatCountdown(_status.timeRemainingMs),
          subtext: 'Unlock & retrieve your items now',
          themeStyle: themeStyle,
        );
    }
  }

  Widget _badge({
    required Color color,
    required Color bgColor,
    required IconData icon,
    required String label,
    required String value,
    required AppThemeStyle themeStyle,
    String? subtext,
  }) {
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: isLuxuryGreen ? const Color(0xFF0C3B2E) : bgColor.withOpacity(0.08),
        borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
        border: Border.all(color: isLuxuryGreen ? const Color(0xFFBB8A52) : bgColor.withOpacity(0.22), width: isLuxuryGreen ? 1.5 : 1.0),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    color: isLuxuryGreen ? const Color(0xFFBB8A52) : color.withOpacity(0.75),
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: isLuxuryGreen ? const Color(0xFFFFFFFF) : color,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                if (subtext != null)
                  Text(
                    subtext,
                    style: TextStyle(
                      fontSize: 11,
                      color: isLuxuryGreen ? const Color(0xFFBB8A52) : color.withOpacity(0.75),
                      fontWeight: FontWeight.w600,
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _pulseBadge({
    required Color color,
    required Color bgColor,
    required IconData icon,
    required String label,
    required String value,
    required AppThemeStyle themeStyle,
    String? subtext,
  }) {
    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);
    // Use TweenAnimationBuilder for a pulsing alpha effect on overdue
    return TweenAnimationBuilder<double>(
      tween: Tween(begin: 0.08, end: 0.16),
      duration: const Duration(seconds: 1),
      curve: Curves.easeInOut,
      builder: (_, alpha, child) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isLuxuryGreen ? const Color(0xFF0C3B2E) : bgColor.withOpacity(alpha),
          borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
          border: Border.all(color: isLuxuryGreen ? const Color(0xFFFFBA00) : bgColor.withOpacity(0.3), width: isLuxuryGreen ? 1.5 : 1.0),
        ),
        child: child,
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.9,
                    color: isLuxuryGreen ? const Color(0xFFFFBA00) : color.withOpacity(0.75),
                  ),
                ),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    color: isLuxuryGreen ? const Color(0xFFFFFFFF) : color,
                  ),
                ),
                if (subtext != null)
                  Text(
                    subtext,
                    style: TextStyle(
                      fontSize: 12,
                      color: isLuxuryGreen ? const Color(0xFFFFBA00) : color,
                      fontWeight: FontWeight.w700,
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
