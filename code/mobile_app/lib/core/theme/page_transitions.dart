import 'package:flutter/material.dart';

/// A custom, premium page transitions builder that implements a smooth horizontal
/// slide-and-fade animation with depth parallax.
class PremiumPageTransitionsBuilder extends PageTransitionsBuilder {
  const PremiumPageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Incoming page: Subtle slide-in from the right side and a smooth fade-in
    final slideIn = Tween<Offset>(
      begin: const Offset(0.08, 0.0), // Starts slightly to the right for a modern, subtle entrance
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: animation,
      curve: Curves.fastEaseInToSlowEaseOut, // Premium dynamic curve
      reverseCurve: Curves.fastOutSlowIn,
    ));

    final fadeIn = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: animation,
      // The fade finishes a bit earlier than the slide to make it feel snappier
      curve: const Interval(0.0, 0.7, curve: Curves.fastOutSlowIn),
    ));

    // Underlying page: Shifts slightly left to create depth/parallax and fades down a bit
    final slideOut = Tween<Offset>(
      begin: Offset.zero,
      end: const Offset(-0.03, 0.0), // Moves slightly left when covered by a new page
    ).animate(CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.fastEaseInToSlowEaseOut,
      reverseCurve: Curves.fastOutSlowIn,
    ));

    final fadeOut = Tween<double>(
      begin: 1.0,
      end: 0.85, // Retains most opacity but dims slightly to signify depth
    ).animate(CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.fastEaseInToSlowEaseOut,
    ));

    return SlideTransition(
      position: slideIn,
      child: FadeTransition(
        opacity: fadeIn,
        child: SlideTransition(
          position: slideOut,
          child: FadeTransition(
            opacity: fadeOut,
            child: child,
          ),
        ),
      ),
    );
  }
}
