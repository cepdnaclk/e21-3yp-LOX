import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../screens/explore_screen.dart';
import '../../../../../core/theme/theme_style.dart';


/// A custom segmented control widget that allows the user to toggle between different sorting strategies for the stations list.
///
/// Visually appears as a pill-shaped container with two mutually exclusive options.
/// (e.g., "Distance" and "High availability").
class SortPill extends StatelessWidget {
  const SortPill({
    super.key,
    required this.value,
    required this.onChanged,
  });

  /// The currently active sorting method.
  final HomeStationSort value;

  /// Callback triggered when the user taps a different sorting segment.
  /// Passes the newly selected [HomeStationSort] back to the parent.
  final ValueChanged<HomeStationSort> onChanged;


  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 20,
      buttonRadius: 16,
      fieldRadius: 24,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
    );

    return Container(
      height: 46,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: theme.colorScheme.primary.withOpacity(0.08),
        borderRadius: BorderRadius.circular(themeStyle.fieldRadius),
        border: themeStyle.cardBorder != null 
            ? Border.all(color: theme.colorScheme.primary.withOpacity(0.3), width: 1.2) 
            : null,
      ),
      child: Row(
        children: [
          Expanded(
            child: _Segment(
              active: value == HomeStationSort.distance,
              text: 'Distance',
              themeStyle: themeStyle,
              onTap: () => onChanged(HomeStationSort.distance),
            ),
          ),
          Expanded(
            child: _Segment(
              active: value == HomeStationSort.availability,
              text: 'High availability',
              themeStyle: themeStyle,
              onTap: () => onChanged(HomeStationSort.availability),
            ),
          ),
        ],
      ),
    );
  }
}

class _Segment extends StatelessWidget {
  const _Segment({
    required this.active,
    required this.text,
    required this.themeStyle,
    required this.onTap,
  });

  final bool active;
  final String text;
  final AppThemeStyle themeStyle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final innerRadius = math.max(themeStyle.fieldRadius - 4, 8.0);
    final activeBg = themeStyle.cardBg ?? theme.colorScheme.surface;
    final activeTxt = theme.colorScheme.primary;
    final inactiveTxt = theme.colorScheme.onSurfaceVariant.withOpacity(0.6);

    return InkWell(
      borderRadius: BorderRadius.circular(innerRadius),
      onTap: onTap,
      child: Container(
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: active ? activeBg : Colors.transparent,
          borderRadius: BorderRadius.circular(innerRadius),
          boxShadow: active
              ? (themeStyle.cardShadow ?? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.07),
                    blurRadius: 14,
                    offset: const Offset(0, 8),
                  ),
                ])
              : null,
        ),
        child: Text(
          text,
          style: TextStyle(
            color: active ? activeTxt : inactiveTxt,
            fontWeight: FontWeight.w900,
          ),
        ),
      ),
    );
  }
}