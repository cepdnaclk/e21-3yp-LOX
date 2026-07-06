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
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 20,
      buttonRadius: 16,
      fieldRadius: 20,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
    );

    final pillBg = theme.colorScheme.primary.withOpacity(0.08);
    final primaryColor = theme.colorScheme.primary;
    final txtColor = theme.colorScheme.onSurface;

    return InkWell(
      borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
      onTap: onTap,
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          color: pillBg,
          borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
          border: themeStyle.cardBorder != null 
              ? Border.all(color: primaryColor.withOpacity(0.3), width: 1.2) 
              : null,
        ),
        child: Row(
          children: [
            CircleAvatar(
              backgroundColor: theme.colorScheme.primary.withOpacity(0.12),
              child: Icon(Icons.place_outlined, color: primaryColor),
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
                child: CircularProgressIndicator(strokeWidth: 2, color: primaryColor),
              )
            else
              Icon(Icons.keyboard_arrow_down_rounded, color: primaryColor),
          ],
        ),
      ),
    );
  }
}