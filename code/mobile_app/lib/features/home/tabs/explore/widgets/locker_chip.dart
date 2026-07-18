import 'package:flutter/material.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../core/theme/theme_style.dart';

class LockerChip extends StatelessWidget {
  const LockerChip({super.key, required this.locker});

  final Locker locker;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 26,
      buttonRadius: 16,
      fieldRadius: 14,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
      statusGreen: isDark ? const Color(0xFF84CC16) : const Color(0xFF4D7C0F),
      statusYellow: isDark ? const Color(0xFFEAB308) : const Color(0xFFCA8A04),
      statusRed: isDark ? const Color(0xFFEF4444) : const Color(0xFFB91C1C),
    );

    final alert = locker.securityAlertActive;

    final Color statusColor;
    final Color cardBg;
    final Color borderCol;

    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);

    if (isLuxuryGreen) {
      if (alert) {
        statusColor = const Color(0xFFFFBA00); // Bright Gold
        cardBg = isDark ? const Color(0xFF0C3B2E) : const Color(0xFFFFFFFF);
        borderCol = const Color(0xFFFFBA00); // Bright Gold
      } else if (locker.isBooked) {
        statusColor = const Color(0xFFBB8A52); // Muted Gold
        cardBg = isDark ? const Color(0xFF0C3B2E) : const Color(0xFFFFFFFF);
        borderCol = const Color(0xFFBB8A52); // Muted Gold
      } else {
        statusColor = const Color(0xFF6D9773); // Sage Green
        cardBg = isDark ? const Color(0xFF0C3B2E) : const Color(0xFFFFFFFF);
        borderCol = const Color(0xFF6D9773); // Sage Green
      }
    } else {
      if (alert) {
        statusColor = themeStyle.statusRed;
        cardBg = themeStyle.statusRed.withOpacity(isDark ? 0.15 : 0.08);
        borderCol = themeStyle.statusRed.withOpacity(isDark ? 0.35 : 0.2);
      } else if (locker.isBooked) {
        statusColor = themeStyle.statusRed;
        cardBg = themeStyle.statusRed.withOpacity(isDark ? 0.15 : 0.08);
        borderCol = themeStyle.statusRed.withOpacity(isDark ? 0.35 : 0.2);
      } else {
        statusColor = themeStyle.statusGreen;
        cardBg = themeStyle.statusGreen.withOpacity(isDark ? 0.15 : 0.08);
        borderCol = themeStyle.statusGreen.withOpacity(isDark ? 0.35 : 0.2);
      }
    }

    final txtColor = theme.colorScheme.onSurface;

    return Container(
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: borderCol, width: alert ? 1.5 : 1),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (alert)
                Icon(Icons.warning_amber_rounded, color: statusColor, size: 18)
              else
                const SizedBox(width: 18),
              Text(
                locker.code,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: txtColor,
                ),
              ),
              const SizedBox(width: 18),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            locker.isBooked ? 'RESERVED' : 'AVAILABLE',
            style: TextStyle(
              fontWeight: FontWeight.w800,
              fontSize: 10,
              letterSpacing: 1.2,
              color: statusColor,
            ),
          ),
        ],
      ),
    );
  }
}
