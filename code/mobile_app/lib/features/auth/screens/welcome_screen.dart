import 'dart:async';
import 'package:flutter/material.dart';
import '../../../core/theme/app_colors.dart';

class WelcomeScreen extends StatefulWidget {
  const WelcomeScreen({
    super.key,
    required this.onLoginTap,
    required this.onRegisterTap,
  });

  final VoidCallback onLoginTap;
  final VoidCallback onRegisterTap;

  @override
  State<WelcomeScreen> createState() => _WelcomeScreenState();
}

class _WelcomeScreenState extends State<WelcomeScreen> {
  late final PageController _pageController;
  int _currentPage = 0;
  Timer? _timer;

  List<Map<String, dynamic>> get _slides => [
    {
      'label': 'SMART LOCKERS',
      'highlighted': 'MADE SIMPLE.',
      'subtitle': 'Experience next-generation locker security with advanced encryption and real-time monitoring.',
      'icon': Icons.lock_person_rounded,
      'gradient': [AppColors.olive, AppColors.oliveDark],
    },
    {
      'label': 'INSTANT ACCESS',
      'highlighted': 'ON THE GO.',
      'subtitle': 'Locate, reserve, and open lockers directly from your mobile phone in seconds.',
      'icon': Icons.bolt_rounded,
      'gradient': [const Color(0xFF1E3A8A), const Color(0xFF0F172A)],
    },
    {
      'label': 'SECURE PAYMENTS',
      'highlighted': 'FULLY PROTECTED.',
      'subtitle': 'Fast, transparent payment processing powered by integrated modern platforms.',
      'icon': Icons.shield_rounded,
      'gradient': [const Color(0xFF14532D), const Color(0xFF022C22)],
    },
    {
      'label': '24/7 SUPPORT',
      'highlighted': 'ALWAYS THERE.',
      'subtitle': 'Rest easy knowing our system is monitored around the clock to assist you anytime.',
      'icon': Icons.support_agent_rounded,
      'gradient': [const Color(0xFF701A75), const Color(0xFF4A044E)],
    },
  ];

  @override
  void initState() {
    super.initState();
    _pageController = PageController(initialPage: 0);
    _startTimer();
  }

  void _startTimer() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (_pageController.hasClients) {
        final nextPage = (_currentPage + 1) % _slides.length;
        _pageController.animateToPage(
          nextPage,
          duration: const Duration(milliseconds: 600),
          curve: Curves.easeInOut,
        );
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Top Slider Carousel (68% height)
          Expanded(
            flex: 68,
            child: Stack(
              children: [
                // Behind Wave Layer
                Positioned.fill(
                  child: ClipPath(
                    clipper: WelcomeCurveClipperBehind(),
                    child: Container(
                      color: ((_slides[_currentPage]['gradient'] as List<Color>)[0]).withOpacity(0.3),
                    ),
                  ),
                ),
                // Foreground Slideshow Layer
                Positioned.fill(
                  child: ClipPath(
                    clipper: WelcomeCurveClipper(),
                    child: PageView.builder(
                      controller: _pageController,
                      onPageChanged: (index) {
                        setState(() {
                          _currentPage = index;
                        });
                        // Reset automatic sliding timer whenever the user manually swipes
                        _startTimer();
                      },
                      itemCount: _slides.length,
                      itemBuilder: (context, index) {
                        final slide = _slides[index];
                        final gradient = slide['gradient'] as List<Color>;
                        return Stack(
                          children: [
                            // Gradient Background
                            Positioned.fill(
                              child: Container(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: gradient,
                                  ),
                                ),
                              ),
                            ),
                            // Security/Tech pattern background image
                            Positioned.fill(
                              child: Opacity(
                                opacity: 0.15,
                                child: Image.asset(
                                  'assets/images/welcome_bg_pattern.png',
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                            // Slide Content
                            SafeArea(
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: 32.0, vertical: 24.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      slide['icon'] as IconData,
                                      color: Colors.white.withOpacity(0.9),
                                      size: 48,
                                    ),
                                    const SizedBox(height: 24),
                                    // Highlighted label blocks similar to bank app in the reference image
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      color: Colors.white.withOpacity(0.15),
                                      child: Text(
                                        slide['label'] as String,
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.5,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      color: Colors.white,
                                      child: Text(
                                        slide['highlighted'] as String,
                                        style: TextStyle(
                                          color: gradient[0],
                                          fontSize: 22,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 1.5,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 20),
                                    Text(
                                      slide['subtitle'] as String,
                                      style: TextStyle(
                                        color: Colors.white.withOpacity(0.85),
                                        fontSize: 14,
                                        height: 1.45,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Page Indicators & Interactive UI (32% height)
          Expanded(
            flex: 32,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 28.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const SizedBox(height: 12),
                  // Slide Indicators
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (index) {
                      final isActive = _currentPage == index;
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: isActive ? 16 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: isActive ? primaryColor : primaryColor.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const Spacer(),

                  // Login Button
                  SizedBox(
                    width: 280,
                    height: 56,
                    child: ElevatedButton(
                      onPressed: widget.onLoginTap,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        elevation: 2,
                        shadowColor: primaryColor.withOpacity(0.3),
                      ),
                      child: const Text(
                        'Login',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Register Button
                  SizedBox(
                    width: 280,
                    height: 56,
                    child: OutlinedButton(
                      onPressed: widget.onRegisterTap,
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: primaryColor.withOpacity(0.8), width: 1.5),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(28),
                        ),
                        foregroundColor: primaryColor,
                        backgroundColor: Colors.white,
                      ),
                      child: const Text(
                        'Register',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class WelcomeCurveClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 60);
    
    final firstControlPoint = Offset(size.width * 0.25, size.height - 10);
    final firstEndPoint = Offset(size.width * 0.5, size.height - 40);
    
    final secondControlPoint = Offset(size.width * 0.75, size.height - 70);
    final secondEndPoint = Offset(size.width, size.height - 30);
    
    path.quadraticBezierTo(
      firstControlPoint.dx,
      firstControlPoint.dy,
      firstEndPoint.dx,
      firstEndPoint.dy,
    );
    
    path.quadraticBezierTo(
      secondControlPoint.dx,
      secondControlPoint.dy,
      secondEndPoint.dx,
      secondEndPoint.dy,
    );
    
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

class WelcomeCurveClipperBehind extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    path.lineTo(0, size.height - 40);
    
    final firstControlPoint = Offset(size.width * 0.25, size.height + 10);
    final firstEndPoint = Offset(size.width * 0.5, size.height - 20);
    
    final secondControlPoint = Offset(size.width * 0.75, size.height - 50);
    final secondEndPoint = Offset(size.width, size.height - 10);
    
    path.quadraticBezierTo(
      firstControlPoint.dx,
      firstControlPoint.dy,
      firstEndPoint.dx,
      firstEndPoint.dy,
    );
    
    path.quadraticBezierTo(
      secondControlPoint.dx,
      secondControlPoint.dy,
      secondEndPoint.dx,
      secondEndPoint.dy,
    );
    
    path.lineTo(size.width, 0);
    path.close();
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}
