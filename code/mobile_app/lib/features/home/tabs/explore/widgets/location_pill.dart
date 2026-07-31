import 'package:flutter/material.dart';
import '../../../../../core/theme/theme_style.dart';

/// A customized, interactive pill-shaped button used to display and trigger location selection.
///
/// Shows a location icon, a text label (usually the current address), and 
/// a trailing icon that swaps to a loading spinner when location detection is in progress.
class LocationPill extends StatelessWidget {
  const LocationPill({
    super.key,
    required this.label,
    required this.loading,
    this.onTap,
  });

  /// The text to display inside the pill (e.g., "Colombo, Sri Lanka" or "Detecting...").
  final String label;

  /// If true, replaces the trailing chevron icon with a circular progress indicator.
  final bool loading;

  /// Callback triggered when the pill is tapped. 
  /// Passing null will automatically disable the ink ripple effect.
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 20,
      buttonRadius: 16,
      fieldRadius: 20,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
      statusGreen: isDark ? const Color(0xFF84CC16) : const Color(0xFF4D7C0F),
      statusYellow: isDark ? const Color(0xFFEAB308) : const Color(0xFFCA8A04),
      statusRed: isDark ? const Color(0xFFEF4444) : const Color(0xFFB91C1C),
    );

    final isLuxuryGreen = themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);

    final primaryColor = theme.colorScheme.primary;
    final txtColor = theme.colorScheme.onSurface;
    final isLight = theme.brightness == Brightness.light;

    final painterColor = isLuxuryGreen
        ? (isLight ? const Color(0xFF6D9773) : const Color(0xFFBB8A52))
        : primaryColor.withOpacity(isLight ? 0.12 : 0.18);

    return InkWell(
      borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
      onTap: onTap,
      child: Container(
        height: 56,
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          gradient: isLuxuryGreen
              ? LinearGradient(
                  colors: isLight
                      ? [const Color(0xFFFFFFFF), const Color(0xFFFFFFFF)]
                      : [const Color(0xFF0C3B2E), const Color(0xFF0C3B2E)],
                )
              : LinearGradient(
                  colors: [
                    primaryColor.withOpacity(isLight ? 0.08 : 0.12),
                    primaryColor.withOpacity(isLight ? 0.03 : 0.05),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
          borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
          border: isLuxuryGreen
              ? Border.all(color: const Color(0xFFBB8A52), width: 1.5)
              : (themeStyle.cardBorder != null 
                  ? Border.all(color: primaryColor.withOpacity(0.3), width: 1.2) 
                  : null),
        ),
        child: Stack(
          children: [
            Positioned.fill(
              child: CustomPaint(
                painter: MapBackgroundPainter(
                  color: painterColor,
                ),
              ),
            ),
            Positioned.fill(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.center,
                  children: [
                    CircleAvatar(
                      backgroundColor: isLuxuryGreen
                          ? const Color(0xFF0C3B2E)
                          : theme.colorScheme.primary.withOpacity(0.12),
                      child: Icon(
                        Icons.place_outlined,
                        color: isLuxuryGreen ? const Color(0xFFFFBA00) : primaryColor,
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Location Text Label
                    Expanded(
                      child: Text(
                        label,
                        style: TextStyle(
                          color: txtColor,
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    if (loading)
                      SizedBox(
                        width: 18, height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: isLuxuryGreen ? const Color(0xFFFFBA00) : primaryColor,
                        ),
                      )
                    else
                      Icon(
                        Icons.keyboard_arrow_down_rounded,
                        color: isLuxuryGreen ? const Color(0xFFBB8A52) : primaryColor,
                      ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MapBackgroundPainter extends CustomPainter {
  final Color color;

  MapBackgroundPainter({required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    // 1. Draw subtle background map grid lines
    final gridPaint = Paint()
      ..color = color.withOpacity(color.opacity * 0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.8;
      
    canvas.drawLine(Offset(0, size.height * 0.3), Offset(size.width, size.height * 0.3), gridPaint);
    canvas.drawLine(Offset(0, size.height * 0.7), Offset(size.width, size.height * 0.7), gridPaint);
    canvas.drawLine(Offset(size.width * 0.25, 0), Offset(size.width * 0.25, size.height), gridPaint);
    canvas.drawLine(Offset(size.width * 0.75, 0), Offset(size.width * 0.75, size.height), gridPaint);

    // 2. Draw thicker curved road paths
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    final path1 = Path();
    path1.moveTo(0, size.height * 0.2);
    path1.quadraticBezierTo(
      size.width * 0.3,
      size.height * 0.8,
      size.width * 0.6,
      size.height * 0.3,
    );
    path1.quadraticBezierTo(
      size.width * 0.8,
      size.height * 0.05,
      size.width,
      size.height * 0.5,
    );

    final path2 = Path();
    path2.moveTo(size.width * 0.2, 0);
    path2.quadraticBezierTo(
      size.width * 0.4,
      size.height * 0.5,
      size.width * 0.3,
      size.height,
    );

    final path3 = Path();
    path3.moveTo(size.width * 0.7, 0);
    path3.quadraticBezierTo(
      size.width * 0.6,
      size.height * 0.4,
      size.width * 0.9,
      size.height,
    );

    canvas.drawPath(path1, paint);
    canvas.drawPath(path2, paint);
    canvas.drawPath(path3, paint);

    // 3. Draw map location POI dots & pulses
    final dotPaint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;

    final pulsePaint = Paint()
      ..color = color.withOpacity(color.opacity * 0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;

    // Middle Pin dot and surrounding pulse
    canvas.drawCircle(Offset(size.width * 0.45, size.height * 0.35), 3.0, dotPaint);
    canvas.drawCircle(Offset(size.width * 0.45, size.height * 0.35), 8.0, pulsePaint);

    // Other POI dots
    canvas.drawCircle(Offset(size.width * 0.75, size.height * 0.65), 2.0, dotPaint);
    canvas.drawCircle(Offset(size.width * 0.15, size.height * 0.75), 2.5, dotPaint);
  }

  @override
  bool shouldRepaint(covariant MapBackgroundPainter oldDelegate) {
    return oldDelegate.color != color;
  }
}