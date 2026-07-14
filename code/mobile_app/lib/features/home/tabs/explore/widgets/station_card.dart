import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../../../../data/models/station.dart';
import '../../../../../core/theme/theme_style.dart';

/// A reusable UI component that displays a summary card for a single locker station.
///
/// This card presents the station's name, code, a progress bar indicating 
/// locker availability, and an optional distance label. It is designed to be 
/// tapped by the user to navigate to the station's detailed view.
class StationCard extends StatelessWidget {
  const StationCard({
    super.key,
    required this.station,
    required this.total,
    required this.free,
    required this.onTap,
    this.distanceLabel,
  });

  /// The station data model containing the name, code, and coordinates.
  final Station station;

  /// The absolute total number of lockers at this station (booked + unbooked).
  final int total;

  /// The number of unbooked, available lockers currently at this station.
  final int free;

  /// A pre-formatted string showing the distance to the station (e.g., "850 m").
  /// If null, the distance badge is hidden entirely.
  final String? distanceLabel;

  /// Callback triggered when the entire card is tapped.
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLight = !isDark;

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

    final primaryColor = theme.colorScheme.primary;
    final cardBg = isLight 
        ? Color.lerp(Colors.white, primaryColor, 0.03)! 
        : theme.colorScheme.surface;
    final txtColor = theme.colorScheme.onSurface;
    final mutedColor = isDark 
        ? theme.colorScheme.onSurfaceVariant 
        : theme.colorScheme.onSurfaceVariant.withOpacity(0.7);
    final trackColor = theme.colorScheme.outlineVariant.withOpacity(0.3);

    // Define status color & icon based on availability
    final Color statusColor;
    final IconData statusIcon;
    if (free > 0) {
      statusColor = themeStyle.statusGreen;
      statusIcon = Icons.lock_open_rounded;
    } else if (total > 0 && free == 0) {
      statusColor = themeStyle.statusYellow;
      statusIcon = Icons.lock_rounded;
    } else {
      statusColor = themeStyle.statusRed;
      statusIcon = Icons.lock_rounded;
    }

    // Calculate availability ratio
    final ratio = total == 0 ? 0.0 : (free / total).clamp(0.0, 1.0);

    return InkWell(
      borderRadius: BorderRadius.circular(themeStyle.cardRadius),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(themeStyle.cardRadius),
          border: Border.all(
            color: primaryColor.withOpacity(isLight ? 0.12 : 0.25),
            width: 1.2,
          ),
          boxShadow: themeStyle.cardShadow ?? [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 18,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // Leading Icon container
            Container(
              width: 60, height: 60,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    statusColor.withOpacity(0.12),
                    statusColor.withOpacity(0.04),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(math.max(themeStyle.cardRadius - 8, 8.0)),
                border: Border.all(
                  color: statusColor.withOpacity(0.2),
                  width: 1.2,
                ),
              ),
              child: Icon(statusIcon, color: statusColor, size: 26),
            ),
            const SizedBox(width: 14),

            // Main Content Column
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Station name
                  Text(
                    station.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                      color: txtColor,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Text(
                        '$free / ${math.max(total, 0)} available',
                        style: TextStyle(
                          fontWeight: FontWeight.w900,
                          color: statusColor,
                        ),
                      ),
                      const Spacer(),

                      // Distance Badge
                      if (distanceLabel != null)
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: primaryColor.withOpacity(0.06),
                            borderRadius: BorderRadius.circular(999),
                            border: Border.all(
                              color: primaryColor.withOpacity(0.15),
                              width: 1.0,
                            ),
                          ),
                          child: Text(
                            distanceLabel!,
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              color: txtColor,
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  // Availability Progress Bar
                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: ratio,
                      minHeight: 8,
                      backgroundColor: trackColor,
                      valueColor: AlwaysStoppedAnimation(statusColor),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 8),
            
            Icon(Icons.chevron_right_rounded, color: mutedColor),
          ],
        ),
      ),
    );
  }
}