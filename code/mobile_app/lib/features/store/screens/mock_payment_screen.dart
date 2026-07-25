import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../data/remote/api_client.dart';

class MockPaymentScreen extends StatefulWidget {
  const MockPaymentScreen({
    super.key,
    required this.client,
    required this.sessionId,
    required this.amount,
    required this.productName,
    this.isOverdue = false,
  });

  final ApiClient client;
  final String sessionId;
  final double amount;
  final String productName;
  final bool isOverdue;

  @override
  State<MockPaymentScreen> createState() => _MockPaymentScreenState();
}

class _MockPaymentScreenState extends State<MockPaymentScreen> {
  // Text Editing Controllers
  final TextEditingController _cardNumberController = TextEditingController();
  final TextEditingController _cardHolderController = TextEditingController();
  final TextEditingController _expiryController = TextEditingController();
  final TextEditingController _cvvController = TextEditingController();

  // Focus Nodes
  final FocusNode _cvvFocusNode = FocusNode();
  final FocusNode _cardNumberFocusNode = FocusNode();
  final FocusNode _cardHolderFocusNode = FocusNode();
  final FocusNode _expiryFocusNode = FocusNode();

  final _formKey = GlobalKey<FormState>();

  // Payment Status State
  bool _isCardFlipped = false;
  bool _isProcessing = false;
  bool _isSuccess = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _cvvFocusNode.addListener(_onCvvFocusChange);
  }

  @override
  void dispose() {
    _cvvFocusNode.removeListener(_onCvvFocusChange);
    _cvvFocusNode.dispose();
    _cardNumberFocusNode.dispose();
    _cardHolderFocusNode.dispose();
    _expiryFocusNode.dispose();
    _cardNumberController.dispose();
    _cardHolderController.dispose();
    _expiryController.dispose();
    _cvvController.dispose();
    super.dispose();
  }

  void _onCvvFocusChange() {
    setState(() {
      _isCardFlipped = _cvvFocusNode.hasFocus;
    });
  }

  String _getCardType(String number) {
    if (number.startsWith('4')) return 'Visa';
    if (number.startsWith('5')) return 'Mastercard';
    if (number.startsWith('3')) return 'American Express';
    return 'Generic';
  }

  Future<void> _handlePayment() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    // Hide keyboard
    FocusScope.of(context).unfocus();

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      // Simulate bank verification delay
      await Future.delayed(const Duration(milliseconds: 2000));
      
      // Call mock fulfill endpoint
      await widget.client.mockFulfillPayment(widget.sessionId);

      // Verify and transition to success state
      setState(() {
        _isProcessing = false;
        _isSuccess = true;
      });

      // Show success briefly before returning to parent screen
      await Future.delayed(const Duration(milliseconds: 1800));
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      setState(() {
        _isProcessing = false;
        _errorMessage = e.toString().replaceAll('Exception: ', '');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? theme.scaffoldBackgroundColor : AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Mock Payment Gateway',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SafeArea(
        child: Stack(
          children: [
            // Main content
            Column(
              children: [
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // ── Summary Header ────────────────────────
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isDark ? theme.colorScheme.surfaceContainer : Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Colors.black.withOpacity(0.04)),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  widget.isOverdue ? Icons.warning_amber_rounded : Icons.shopping_bag_outlined,
                                  color: AppColors.olive,
                                  size: 28,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        widget.isOverdue ? 'Overdue Locker Fee' : widget.productName,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 15,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        'Reference: ${widget.sessionId.substring(math.max(0, widget.sessionId.length - 8)).toUpperCase()}',
                                        style: TextStyle(
                                          color: isDark ? Colors.white60 : AppColors.textLabel,
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  'Rs. ${widget.amount.round()}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.w900,
                                    fontSize: 18,
                                    color: AppColors.olive,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),

                          // ── 3D Card Animation Showcase ────────────
                          AnimatedBuilder(
                            animation: _cardNumberController,
                            builder: (context, _) {
                              return TweenAnimationBuilder<double>(
                                tween: Tween<double>(begin: 0, end: _isCardFlipped ? math.pi : 0),
                                duration: const Duration(milliseconds: 400),
                                builder: (context, angle, child) {
                                  final isBack = angle >= math.pi / 2;
                                  return Transform(
                                    alignment: Alignment.center,
                                    transform: Matrix4.identity()
                                      ..setEntry(3, 2, 0.0012) // 3D Perspective
                                      ..rotateY(angle),
                                    child: isBack
                                        ? Transform(
                                            alignment: Alignment.center,
                                            transform: Matrix4.identity()..rotateY(math.pi),
                                            child: _buildCardBack(),
                                          )
                                        : _buildCardFront(),
                                  );
                                },
                              );
                            },
                          ),
                          const SizedBox(height: 32),

                          // ── Form Inputs ───────────────────────────
                          _buildTextField(
                            controller: _cardNumberController,
                            focusNode: _cardNumberFocusNode,
                            label: 'CARD NUMBER',
                            hint: '4111 1111 1111 1111',
                            icon: Icons.credit_card,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(16),
                              _CardNumberInputFormatter(),
                            ],
                            validator: (val) {
                              if (val == null || val.replaceAll(' ', '').length < 16) {
                                return 'Enter a valid 16-digit card number';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          _buildTextField(
                            controller: _cardHolderController,
                            focusNode: _cardHolderFocusNode,
                            label: 'CARDHOLDER NAME',
                            hint: 'JOHN SMITH',
                            icon: Icons.person_outline,
                            capitalization: TextCapitalization.characters,
                            validator: (val) {
                              if (val == null || val.trim().isEmpty) {
                                return 'Enter cardholder name';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),
                          Row(
                            children: [
                              Expanded(
                                flex: 3,
                                child: _buildTextField(
                                  controller: _expiryController,
                                  focusNode: _expiryFocusNode,
                                  label: 'EXPIRY DATE',
                                  hint: 'MM/YY',
                                  icon: Icons.calendar_today_outlined,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(4),
                                    _CardExpiryInputFormatter(),
                                  ],
                                  validator: (val) {
                                    if (val == null || val.length < 5) {
                                      return 'Enter valid MM/YY';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                              const SizedBox(width: 16),
                              Expanded(
                                flex: 2,
                                child: _buildTextField(
                                  controller: _cvvController,
                                  focusNode: _cvvFocusNode,
                                  label: 'CVV',
                                  hint: '•••',
                                  icon: Icons.lock_outline,
                                  obscure: true,
                                  keyboardType: TextInputType.number,
                                  inputFormatters: [
                                    FilteringTextInputFormatter.digitsOnly,
                                    LengthLimitingTextInputFormatter(3),
                                  ],
                                  validator: (val) {
                                    if (val == null || val.length < 3) {
                                      return 'Invalid';
                                    }
                                    return null;
                                  },
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          if (_errorMessage != null) ...[
                            Text(
                              _errorMessage!,
                              textAlign: TextAlign.center,
                              style: const TextStyle(
                                color: Color(0xFFC95454),
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                            const SizedBox(height: 12),
                          ],
                        ],
                      ),
                    ),
                  ),
                ),

                // Pay Button at bottom
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  decoration: BoxDecoration(
                    color: isDark ? theme.colorScheme.surface : Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.04),
                        blurRadius: 8,
                        offset: const Offset(0, -4),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.olive,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      elevation: 0,
                    ),
                    onPressed: _handlePayment,
                    child: Text(
                      'PAY RS. ${widget.amount.round()}',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.0,
                      ),
                    ),
                  ),
                ),
              ],
            ),

            // ── Processing Overlay ──────────────────────────────────
            if (_isProcessing)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(0.7),
                  child: Center(
                    child: Card(
                      color: isDark ? const Color(0xFF1E201B) : Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      margin: const EdgeInsets.all(32),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.olive),
                              strokeWidth: 4,
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Processing Secure Payment',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Please wait while we confirm your checkout session status on the secure bank node...',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppColors.textLabel,
                                fontSize: 12,
                                height: 1.4,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),

            // ── Success Overlay ─────────────────────────────────────
            if (_isSuccess)
              Positioned.fill(
                child: Container(
                  color: Colors.black.withOpacity(0.7),
                  child: Center(
                    child: Card(
                      color: isDark ? const Color(0xFF1E201B) : Colors.white,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(24),
                      ),
                      margin: const EdgeInsets.all(32),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              height: 72,
                              width: 72,
                              decoration: BoxDecoration(
                                color: AppColors.olive.withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                Icons.check_circle_rounded,
                                color: AppColors.olive,
                                size: 56,
                              ),
                            ),
                            const SizedBox(height: 24),
                            const Text(
                              'Payment Successful!',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              'Your transaction is completed and verified. Locker access updates have been synchronized.',
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: AppColors.textLabel,
                                fontSize: 12,
                                height: 1.4,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── Widgets ────────────────────────────────────────────────────────
  Widget _buildTextField({
    required TextEditingController controller,
    required FocusNode focusNode,
    required String label,
    required String hint,
    required IconData icon,
    bool obscure = false,
    TextInputType keyboardType = TextInputType.text,
    List<TextInputFormatter>? inputFormatters,
    TextCapitalization capitalization = TextCapitalization.none,
    String? Function(String?)? validator,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.2,
            color: AppColors.textLabel,
          ),
        ),
        const SizedBox(height: 6),
        TextFormField(
          controller: controller,
          focusNode: focusNode,
          obscureText: obscure,
          keyboardType: keyboardType,
          inputFormatters: inputFormatters,
          textCapitalization: capitalization,
          validator: validator,
          onChanged: (_) => setState(() {}),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: Colors.black26),
            prefixIcon: Icon(icon, size: 20, color: AppColors.textLabel),
            filled: true,
            fillColor: isDark ? theme.colorScheme.surfaceContainerHigh : AppColors.fieldBackground,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide.none,
            ),
            errorStyle: const TextStyle(fontWeight: FontWeight.bold),
            contentPadding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildCardFront() {
    final cardNumber = _cardNumberController.text.isEmpty
        ? '•••• •••• •••• ••••'
        : _cardNumberController.text;
    final cardHolder = _cardHolderController.text.isEmpty
        ? 'CARDHOLDER NAME'
        : _cardHolderController.text.toUpperCase();
    final cardExpiry = _expiryController.text.isEmpty
        ? 'MM/YY'
        : _expiryController.text;
    final cardType = _cardNumberController.text.isEmpty
        ? ''
        : _getCardType(_cardNumberController.text);

    return Container(
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [
            Color(0xFF3E412A),
            Color(0xFF5C5F3E),
            Color(0xFF8A8C6F),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.olive.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Gold Chip Graphic
              Container(
                width: 48,
                height: 36,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(8),
                  gradient: const LinearGradient(
                    colors: [Color(0xFFF1C40F), Color(0xFFF39C12)],
                  ),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    Divider(color: Colors.black.withOpacity(0.2), height: 1, thickness: 1),
                    Divider(color: Colors.black.withOpacity(0.2), height: 1, thickness: 1),
                  ],
                ),
              ),
              // Dynamic Card Logo
              if (cardType == 'Visa')
                const Text('VISA', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic))
              else if (cardType == 'Mastercard')
                const Text('MC', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold))
              else if (cardType == 'American Express')
                const Text('AMEX', style: TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold))
              else
                const Text('CARD', style: TextStyle(color: Colors.white60, fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          Text(
            cardNumber,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              letterSpacing: 2,
              fontWeight: FontWeight.bold,
              shadows: [
                Shadow(color: Colors.black38, offset: Offset(1, 2), blurRadius: 2),
              ],
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'CARDHOLDER',
                      style: TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      cardHolder,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text(
                    'EXPIRS',
                    style: TextStyle(color: Colors.white54, fontSize: 8, fontWeight: FontWeight.w800, letterSpacing: 0.8),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    cardExpiry,
                    style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCardBack() {
    final cvv = _cvvController.text.isEmpty
        ? '•••'
        : _cvvController.text;

    return Container(
      height: 200,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: const LinearGradient(
          colors: [
            Color(0xFF2C2E1F),
            Color(0xFF3E412A),
            Color(0xFF5C5F3E),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.olive.withOpacity(0.3),
            blurRadius: 15,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 24),
          // Magnetic Strip
          Container(
            height: 40,
            color: Colors.black,
          ),
          const SizedBox(height: 24),
          // Signature + CVV panel
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    height: 36,
                    color: Colors.white,
                    alignment: Alignment.centerLeft,
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                    child: const Text(
                      'smart locker co.',
                      style: TextStyle(
                        color: Colors.black45,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
                Container(
                  width: 60,
                  height: 36,
                  color: Colors.amber[200],
                  alignment: Alignment.center,
                  child: Text(
                    cvv,
                    style: const TextStyle(
                      color: Colors.black,
                      fontWeight: FontWeight.w900,
                      fontSize: 15,
                      letterSpacing: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Spacer(),
          const Padding(
            padding: EdgeInsets.fromLTRB(24, 0, 24, 16),
            child: Text(
              'This is a secure mock sandbox credit card checkout mechanism.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white30, fontSize: 8, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Formatting Classes ───────────────────────────────────────────────
class _CardNumberInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.replaceAll(' ', '');
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      final nonZeroIndex = i + 1;
      if (nonZeroIndex % 4 == 0 && nonZeroIndex != text.length) {
        buffer.write(' ');
      }
    }

    final string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}

class _CardExpiryInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final text = newValue.text.replaceAll('/', '');
    final buffer = StringBuffer();
    for (int i = 0; i < text.length; i++) {
      buffer.write(text[i]);
      final nonZeroIndex = i + 1;
      if (nonZeroIndex == 2 && nonZeroIndex != text.length) {
        buffer.write('/');
      }
    }

    final string = buffer.toString();
    return newValue.copyWith(
      text: string,
      selection: TextSelection.collapsed(offset: string.length),
    );
  }
}
