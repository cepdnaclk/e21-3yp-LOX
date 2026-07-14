import 'package:flutter/material.dart';

/// A custom theme extension to define specific style attributes for premium locker theme presets.
class AppThemeStyle extends ThemeExtension<AppThemeStyle> {
  final double cardRadius;
  final double buttonRadius;
  final double fieldRadius;
  final Border? cardBorder;
  final List<BoxShadow>? cardShadow;
  final Color navBarBg;
  final Border? navBarBorder;
  final double navBarBlur;
  final Color navBarActiveColor;
  final Color? glowColor;
  final Color? cardBg;
  final Color statusGreen;
  final Color statusYellow;
  final Color statusRed;

  AppThemeStyle({
    required this.cardRadius,
    required this.buttonRadius,
    required this.fieldRadius,
    this.cardBorder,
    this.cardShadow,
    required this.navBarBg,
    this.navBarBorder,
    required this.navBarBlur,
    required this.navBarActiveColor,
    this.glowColor,
    this.cardBg,
    required this.statusGreen,
    required this.statusYellow,
    required this.statusRed,
  });

  @override
  AppThemeStyle copyWith({
    double? cardRadius,
    double? buttonRadius,
    double? fieldRadius,
    Border? cardBorder,
    List<BoxShadow>? cardShadow,
    Color? navBarBg,
    Border? navBarBorder,
    double? navBarBlur,
    Color? navBarActiveColor,
    Color? glowColor,
    Color? cardBg,
    Color? statusGreen,
    Color? statusYellow,
    Color? statusRed,
  }) {
    return AppThemeStyle(
      cardRadius: cardRadius ?? this.cardRadius,
      buttonRadius: buttonRadius ?? this.buttonRadius,
      fieldRadius: fieldRadius ?? this.fieldRadius,
      cardBorder: cardBorder ?? this.cardBorder,
      cardShadow: cardShadow ?? this.cardShadow,
      navBarBg: navBarBg ?? this.navBarBg,
      navBarBorder: navBarBorder ?? this.navBarBorder,
      navBarBlur: navBarBlur ?? this.navBarBlur,
      navBarActiveColor: navBarActiveColor ?? this.navBarActiveColor,
      glowColor: glowColor ?? this.glowColor,
      cardBg: cardBg ?? this.cardBg,
      statusGreen: statusGreen ?? this.statusGreen,
      statusYellow: statusYellow ?? this.statusYellow,
      statusRed: statusRed ?? this.statusRed,
    );
  }

  @override
  AppThemeStyle lerp(ThemeExtension<AppThemeStyle>? other, double t) {
    if (other is! AppThemeStyle) {
      return this;
    }
    return AppThemeStyle(
      cardRadius: _lerpDouble(cardRadius, other.cardRadius, t),
      buttonRadius: _lerpDouble(buttonRadius, other.buttonRadius, t),
      fieldRadius: _lerpDouble(fieldRadius, other.fieldRadius, t),
      cardBorder: Border.lerp(cardBorder, other.cardBorder, t),
      cardShadow: t < 0.5 ? cardShadow : other.cardShadow,
      navBarBg: Color.lerp(navBarBg, other.navBarBg, t) ?? navBarBg,
      navBarBorder: Border.lerp(navBarBorder, other.navBarBorder, t),
      navBarBlur: _lerpDouble(navBarBlur, other.navBarBlur, t),
      navBarActiveColor: Color.lerp(navBarActiveColor, other.navBarActiveColor, t) ?? navBarActiveColor,
      glowColor: Color.lerp(glowColor, other.glowColor, t),
      cardBg: Color.lerp(cardBg, other.cardBg, t),
      statusGreen: Color.lerp(statusGreen, other.statusGreen, t) ?? statusGreen,
      statusYellow: Color.lerp(statusYellow, other.statusYellow, t) ?? statusYellow,
      statusRed: Color.lerp(statusRed, other.statusRed, t) ?? statusRed,
    );
  }

  double _lerpDouble(double a, double b, double t) => a + (b - a) * t;
}
