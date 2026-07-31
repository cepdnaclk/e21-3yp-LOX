import 'dart:math' as math;
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:path_provider/path_provider.dart';
import 'package:open_filex/open_filex.dart';
import '../../../../data/models/order.dart';
import '../../../../data/models/user_profile.dart';
import '../../../../data/remote/api_client.dart';
import '../../../../core/theme/app_colors.dart';
import 'mock_payment_screen.dart';

class MyPurchasesScreen extends StatefulWidget {
  const MyPurchasesScreen({
    super.key,
    required this.client,
    required this.user,
  });

  final ApiClient client;
  final UserProfile user;

  @override
  State<MyPurchasesScreen> createState() => _MyPurchasesScreenState();
}

class _MyPurchasesScreenState extends State<MyPurchasesScreen> {
  List<Order> _purchases = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadPurchases();
  }

  Future<void> _loadPurchases() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final orders = await widget.client.fetchOrders();
      // Filter out OVERDUE_FEE to only show locker purchases
      final lockerPurchases = orders.where((o) => o.productCategory.toUpperCase() != 'OVERDUE_FEE').toList();
      // Newest first
      lockerPurchases.sort((a, b) {
        if (a.createdAt == null && b.createdAt == null) return 0;
        if (a.createdAt == null) return 1;
        if (b.createdAt == null) return -1;
        return b.createdAt!.compareTo(a.createdAt!);
      });

      if (mounted) {
        setState(() {
          _purchases = lockerPurchases;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString().replaceAll('Exception: ', '');
          _loading = false;
        });
      }
    }
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return '—';
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year}';
  }

  void _showReceiptModal(Order order) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _ReceiptBottomSheet(order: order, user: widget.user),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? theme.scaffoldBackgroundColor : AppColors.background,
      appBar: AppBar(
        title: const Text(
          'My Purchases',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: RefreshIndicator(
        onRefresh: _loadPurchases,
        color: AppColors.olive,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    children: [
                      const SizedBox(height: 120),
                      const Icon(Icons.error_outline_rounded, size: 64, color: Color(0xFFC95454)),
                      const SizedBox(height: 16),
                      Center(
                        child: Text(
                          _error!,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Center(
                        child: ElevatedButton(
                          onPressed: _loadPurchases,
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.olive),
                          child: const Text('Retry', style: TextStyle(color: Colors.white)),
                        ),
                      ),
                    ],
                  )
                : _purchases.isEmpty
                    ? ListView(
                        children: [
                          const SizedBox(height: 140),
                          Icon(Icons.shopping_bag_outlined, size: 72, color: AppColors.textMuted.withOpacity(0.5)),
                          const SizedBox(height: 16),
                          Center(
                            child: Text(
                              'No purchases found.',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: AppColors.textLabel,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Center(
                            child: Text(
                              'Locker purchases will appear here.',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                        itemCount: _purchases.length,
                        itemBuilder: (context, index) {
                          final order = _purchases[index];
                          final isPaid = order.status.toUpperCase() == 'PAID';
                          final isPending = order.status.toUpperCase() == 'PENDING';

                          Color statusBg = const Color(0xFFF3E9E8);
                          Color statusText = const Color(0xFFB85C58);
                          if (isPaid) {
                            statusBg = const Color(0xFFE4ECE5);
                            statusText = AppColors.olive;
                          } else if (isPending) {
                            statusBg = const Color(0xFFFEF3C7);
                            statusText = const Color(0xFFD97706);
                          }

                          return Card(
                            elevation: 0,
                            color: isDark ? theme.colorScheme.surfaceContainer : Colors.white,
                            margin: const EdgeInsets.only(bottom: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: Colors.black.withOpacity(0.04)),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(18),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        order.productCategory.toUpperCase(),
                                        style: TextStyle(
                                          fontSize: 9,
                                          fontWeight: FontWeight.w800,
                                          color: AppColors.textLabel,
                                          letterSpacing: 1.2,
                                        ),
                                      ),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: statusBg,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          order.status.toUpperCase(),
                                          style: TextStyle(
                                            color: statusText,
                                            fontSize: 10,
                                            fontWeight: FontWeight.w900,
                                            letterSpacing: 0.8,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    order.productName,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w900,
                                    ),
                                  ),
                                  if (order.selectedColor.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      'Color Variant: ${order.selectedColor}',
                                      style: TextStyle(
                                        fontSize: 13,
                                        color: AppColors.textLabel,
                                        fontWeight: FontWeight.w600,
                                      ),
                                    ),
                                  ],
                                  const SizedBox(height: 6),
                                  Text(
                                    'Order Date: ${_formatDate(order.createdAt)}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: AppColors.textMuted,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const Divider(height: 28),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Qty: ${order.quantity} • Rs. ${order.unitPrice.round()} each',
                                        style: TextStyle(
                                          color: AppColors.textLabel,
                                          fontWeight: FontWeight.w600,
                                          fontSize: 13,
                                        ),
                                      ),
                                      Text(
                                        'Total: Rs. ${order.amount.round()}',
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w900,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ],
                                  ),
                                  if (isPending) ...[
                                    const SizedBox(height: 16),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 44,
                                      child: ElevatedButton(
                                        style: ElevatedButton.styleFrom(
                                          backgroundColor: AppColors.olive,
                                          foregroundColor: Colors.white,
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                          elevation: 0,
                                        ),
                                        onPressed: () async {
                                           final success = await Navigator.of(context).push<bool>(
                                             MaterialPageRoute(
                                               builder: (_) => MockPaymentScreen(
                                                 client: widget.client,
                                                 sessionId: order.stripeSessionId,
                                                 amount: order.amount,
                                                 productName: order.productName,
                                               ),
                                             ),
                                           );
                                           if (success == true) {
                                             _loadPurchases();
                                           }
                                         },
                                        child: Text(
                                          'COMPLETE PAYMENT',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 1.0,
                                            fontSize: 12,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ] else if (isPaid) ...[
                                    const SizedBox(height: 16),
                                    SizedBox(
                                      width: double.infinity,
                                      height: 44,
                                      child: OutlinedButton.icon(
                                        style: OutlinedButton.styleFrom(
                                          foregroundColor: AppColors.olive,
                                          side: BorderSide(color: AppColors.olive.withOpacity(0.4), width: 1.5),
                                          shape: RoundedRectangleBorder(
                                            borderRadius: BorderRadius.circular(12),
                                          ),
                                        ),
                                        icon: const Icon(Icons.download_rounded, size: 18),
                                        label: Text(
                                          'DOWNLOAD RECEIPT',
                                          style: TextStyle(
                                            fontWeight: FontWeight.w800,
                                            letterSpacing: 1.0,
                                            fontSize: 12,
                                          ),
                                        ),
                                        onPressed: () => _showReceiptModal(order),
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}

// ── Receipt Bottom Sheet ─────────────────────────────────────────────
class _ReceiptBottomSheet extends StatefulWidget {
  const _ReceiptBottomSheet({
    required this.order,
    required this.user,
  });

  final Order order;
  final UserProfile user;

  @override
  State<_ReceiptBottomSheet> createState() => _ReceiptBottomSheetState();
}

class _ReceiptBottomSheetState extends State<_ReceiptBottomSheet> {
  bool _isDownloading = false;
  bool _downloadFinished = false;

  Future<void> _triggerDownload() async {
    setState(() {
      _isDownloading = true;
    });

    try {
      final pdf = pw.Document();

      final primaryColor = PdfColor.fromHex('#3D5A3A'); // Elegant dark olive green
      final darkTextColor = PdfColor.fromHex('#2C3E2B'); // Deep charcoal green
      final mutedTextColor = PdfColors.grey700;
      final lightBg = PdfColor.fromHex('#F4F6F4'); // Soft green-grey background

      final shortOrderId = widget.order.id.substring(math.max(0, widget.order.id.length - 8)).toUpperCase();

      // Add receipt page
      pdf.addPage(
        pw.Page(
          pageFormat: PdfPageFormat.a4,
          build: (pw.Context context) {
            return pw.Column(
              crossAxisAlignment: pw.CrossAxisAlignment.stretch,
              children: [
                // ── Enhanced Colored Header ─────────────────────────
                pw.Container(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                  decoration: pw.BoxDecoration(
                    color: primaryColor,
                    borderRadius: const pw.BorderRadius.vertical(top: pw.Radius.circular(8)),
                  ),
                  child: pw.Row(
                    mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                    children: [
                      pw.Column(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Text(
                            'LOX SMART LOCKER',
                            style: pw.TextStyle(
                              fontSize: 22,
                              fontWeight: pw.FontWeight.bold,
                              color: PdfColors.white,
                              letterSpacing: 1.2,
                            ),
                          ),
                          pw.SizedBox(height: 4),
                          pw.Text(
                            'Secure Delivery & Storage Network',
                            style: const pw.TextStyle(
                              fontSize: 11,
                              color: PdfColors.grey200,
                            ),
                          ),
                        ],
                      ),
                      pw.Container(
                        padding: const pw.EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: pw.BoxDecoration(
                          color: PdfColor.fromHex('#E6EFE6'),
                          borderRadius: pw.BorderRadius.circular(20),
                        ),
                        child: pw.Text(
                          'PAID IN FULL',
                          style: pw.TextStyle(
                            color: primaryColor,
                            fontSize: 11,
                            fontWeight: pw.FontWeight.bold,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                pw.Padding(
                  padding: const pw.EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                  child: pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.stretch,
                    children: [
                      // ── Billing & Transaction Details ─────────────────
                      pw.Row(
                        crossAxisAlignment: pw.CrossAxisAlignment.start,
                        children: [
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  'BILLED TO',
                                  style: pw.TextStyle(
                                    fontSize: 10,
                                    fontWeight: pw.FontWeight.bold,
                                    color: primaryColor,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                pw.SizedBox(height: 6),
                                pw.Text(
                                  widget.user.name,
                                  style: pw.TextStyle(
                                    fontSize: 13,
                                    fontWeight: pw.FontWeight.bold,
                                    color: darkTextColor,
                                  ),
                                ),
                                pw.SizedBox(height: 2),
                                pw.Text(
                                  widget.user.email,
                                  style: pw.TextStyle(
                                    fontSize: 11,
                                    color: mutedTextColor,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          pw.Expanded(
                            child: pw.Column(
                              crossAxisAlignment: pw.CrossAxisAlignment.start,
                              children: [
                                pw.Text(
                                  'INVOICE INFO',
                                  style: pw.TextStyle(
                                    fontSize: 10,
                                    fontWeight: pw.FontWeight.bold,
                                    color: primaryColor,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                                pw.SizedBox(height: 6),
                                _buildPdfDetailRow('Invoice Ref:', '#$shortOrderId', darkTextColor),
                                _buildPdfDetailRow('Date Paid:', _formatDate(widget.order.createdAt), darkTextColor),
                                _buildPdfDetailRow('Payment Mode:', 'Stripe Sandbox', darkTextColor),
                              ],
                            ),
                          ),
                        ],
                      ),
                      
                      pw.SizedBox(height: 28),
                      pw.Divider(thickness: 1.0, color: PdfColors.grey300),
                      pw.SizedBox(height: 16),

                      // ── Checkout Items Table ───────────────────────────
                      pw.Container(
                        padding: const pw.EdgeInsets.all(12),
                        decoration: pw.BoxDecoration(
                          color: lightBg,
                          borderRadius: pw.BorderRadius.circular(6),
                        ),
                        child: pw.Row(
                          children: [
                            pw.Expanded(
                              flex: 4,
                              child: pw.Text('ITEM DESCRIPTION', style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: primaryColor)),
                            ),
                            pw.Expanded(
                              flex: 1,
                              child: pw.Text('QTY', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: primaryColor)),
                            ),
                            pw.Expanded(
                              flex: 2,
                              child: pw.Text('UNIT PRICE', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: primaryColor)),
                            ),
                            pw.Expanded(
                              flex: 2,
                              child: pw.Text('TOTAL', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 10, color: primaryColor)),
                            ),
                          ],
                        ),
                      ),
                      pw.SizedBox(height: 10),

                      // Item Detail Row
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Row(
                          children: [
                            pw.Expanded(
                              flex: 4,
                              child: pw.Column(
                                crossAxisAlignment: pw.CrossAxisAlignment.start,
                                children: [
                                  pw.Text(
                                    widget.order.productName,
                                    style: pw.TextStyle(fontWeight: pw.FontWeight.bold, fontSize: 13, color: darkTextColor),
                                  ),
                                  if (widget.order.selectedColor.isNotEmpty) ...[
                                    pw.SizedBox(height: 3),
                                    pw.Text(
                                      'Variant: ${widget.order.selectedColor}',
                                      style: pw.TextStyle(color: mutedTextColor, fontSize: 10),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            pw.Expanded(
                              flex: 1,
                              child: pw.Text(
                                '${widget.order.quantity}',
                                textAlign: pw.TextAlign.center,
                                style: pw.TextStyle(color: darkTextColor, fontSize: 12),
                              ),
                            ),
                            pw.Expanded(
                              flex: 2,
                              child: pw.Text(
                                'Rs. ${widget.order.unitPrice.round()}',
                                textAlign: pw.TextAlign.right,
                                style: pw.TextStyle(color: darkTextColor, fontSize: 12),
                              ),
                            ),
                            pw.Expanded(
                              flex: 2,
                              child: pw.Text(
                                'Rs. ${(widget.order.unitPrice * widget.order.quantity).round()}',
                                textAlign: pw.TextAlign.right,
                                style: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: darkTextColor, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                      pw.Divider(thickness: 0.5, color: PdfColors.grey300),

                      // Delivery Fee Row
                      pw.Padding(
                        padding: const pw.EdgeInsets.all(12),
                        child: pw.Row(
                          children: [
                            pw.Expanded(
                              flex: 7,
                              child: pw.Text(
                                'Delivery & Shipping Fee',
                                style: pw.TextStyle(color: mutedTextColor, fontSize: 12),
                              ),
                            ),
                            pw.Expanded(
                              flex: 2,
                              child: pw.Text(
                                widget.order.deliveryFee == 0 ? 'FREE' : 'Rs. ${widget.order.deliveryFee.round()}',
                                textAlign: pw.TextAlign.right,
                                style: pw.TextStyle(
                                  fontWeight: pw.FontWeight.bold,
                                  color: darkTextColor,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      pw.SizedBox(height: 12),
                      pw.Divider(thickness: 1.5, color: primaryColor),
                      pw.SizedBox(height: 12),

                      // Grand Total Row
                      pw.Row(
                          mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                        children: [
                          pw.Text(
                            'GRAND TOTAL',
                            style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold, color: darkTextColor),
                          ),
                          pw.Text(
                            'Rs. ${widget.order.amount.round()}',
                            style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold, color: primaryColor),
                          ),
                        ],
                      ),
                      
                      pw.SizedBox(height: 48),

                      // Barcode simulation
                      pw.Center(
                        child: pw.Column(
                          children: [
                            pw.Container(
                              height: 40,
                              child: pw.Row(
                                mainAxisAlignment: pw.MainAxisAlignment.center,
                                children: [2, 4, 1, 3, 2, 5, 1, 4, 2, 1, 3, 2, 4, 1, 2, 5, 2, 1, 3, 4, 1, 2, 3, 5, 2, 1].map((w) {
                                  return pw.Container(
                                    width: w.toDouble() * 0.8,
                                    height: 35,
                                    color: PdfColors.black,
                                    margin: const pw.EdgeInsets.only(right: 1.2),
                                  );
                                }).toList(),
                              ),
                            ),
                            pw.SizedBox(height: 4),
                            pw.Text(
                              '* ORDER-$shortOrderId *',
                              style: pw.TextStyle(fontSize: 8, letterSpacing: 3, color: mutedTextColor),
                            ),
                          ],
                        ),
                      ),
                      pw.SizedBox(height: 32),

                      pw.Center(
                        child: pw.Text(
                          'Thank you for using LOX Smart Locker Network.',
                          style: pw.TextStyle(fontStyle: pw.FontStyle.italic, color: mutedTextColor, fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      );

      // Save PDF to downloads/documents folder
      final directory = await getApplicationDocumentsDirectory();
      final path = '${directory.path}/receipt_${widget.order.id.substring(math.max(0, widget.order.id.length - 8)).toUpperCase()}.pdf';
      final file = File(path);
      await file.writeAsBytes(await pdf.save());

      setState(() {
        _isDownloading = false;
        _downloadFinished = true;
      });

      await Future.delayed(const Duration(milliseconds: 800));

      if (mounted) {
        Navigator.of(context).pop();
        // Open the generated PDF file natively
        await OpenFilex.open(path);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              'Receipt saved and opened successfully: ${path.split('/').last}',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            backgroundColor: AppColors.olive,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      setState(() {
        _isDownloading = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to generate/open PDF: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  pw.Widget _buildPdfDetailRow(String label, String value, PdfColor valueColor) {
    return pw.Padding(
      padding: const pw.EdgeInsets.only(bottom: 4),
      child: pw.Row(
        children: [
          pw.Text(
            '$label ',
            style: const pw.TextStyle(
              fontSize: 10,
              color: PdfColors.grey700,
            ),
          ),
          pw.Text(
            value,
            style: pw.TextStyle(
              fontSize: 10,
              fontWeight: pw.FontWeight.bold,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return '—';
    final local = dt.toLocal();
    return '${local.day}/${local.month}/${local.year} at ${local.hour}:${local.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final shortOrderId = widget.order.id.substring(math.max(0, widget.order.id.length - 8)).toUpperCase();

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E201B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
      ),
      padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: Stack(
        children: [
          SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Top drag bar indicator
                Center(
                  child: Container(
                    width: 40,
                    height: 5,
                    decoration: BoxDecoration(
                      color: isDark ? Colors.white24 : Colors.black12,
                      borderRadius: BorderRadius.circular(3),
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // ── Invoice Layout Header ───────────────────────────
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'LOX SMART LOCKER',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 1.0,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Secure Delivery Network',
                          style: TextStyle(
                            fontSize: 11,
                            color: AppColors.textLabel,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE4ECE5),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        'PAID IN FULL',
                        style: TextStyle(
                          color: AppColors.olive,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _buildDottedLine(isDark),
                const SizedBox(height: 20),

                // Transaction parameters
                _buildReceiptRow('ORDER REF', '#$shortOrderId'),
                _buildReceiptRow('TRANSACTION DATE', _formatDate(widget.order.createdAt)),
                _buildReceiptRow('CUSTOMER NAME', widget.user.name.toUpperCase()),
                _buildReceiptRow('CUSTOMER EMAIL', widget.user.email),
                _buildReceiptRow('PAYMENT NODE', 'Mock Visa Card Sandbox'),

                const SizedBox(height: 20),
                _buildDottedLine(isDark),
                const SizedBox(height: 20),

                // Locker Items detail table header
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('ITEM DESCRIPTION', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textLabel)),
                    Text('TOTAL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: AppColors.textLabel)),
                  ],
                ),
                const SizedBox(height: 12),

                // Locker Item details
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.order.productName,
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Variant: ${widget.order.selectedColor.isEmpty ? "Standard" : widget.order.selectedColor} • Qty: ${widget.order.quantity}',
                            style: TextStyle(color: AppColors.textLabel, fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'Rs. ${(widget.order.unitPrice * widget.order.quantity).round()}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                  ],
                ),

                const SizedBox(height: 16),
                // Shipping details
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Delivery & Shipping',
                      style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: AppColors.textLabel),
                    ),
                    Text(
                      widget.order.deliveryFee == 0 ? 'FREE' : 'Rs. ${widget.order.deliveryFee.round()}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13),
                    ),
                  ],
                ),

                const SizedBox(height: 20),
                _buildDottedLine(isDark),
                const SizedBox(height: 20),

                // Grand Total
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'GRAND TOTAL',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
                    ),
                    Text(
                      'Rs. ${widget.order.amount.round()}',
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.olive),
                    ),
                  ],
                ),

                const SizedBox(height: 32),

                // Barcode simulation
                Center(child: _buildBarcodeGraphic(isDark, shortOrderId)),

                const SizedBox(height: 36),

                // Action download button
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.olive,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                    elevation: 0,
                  ),
                  icon: const Icon(Icons.file_download_outlined),
                  label: const Text(
                    'SAVE RECEIPT PDF',
                    style: TextStyle(
                      fontWeight: FontWeight.w900,
                      letterSpacing: 1.0,
                    ),
                  ),
                  onPressed: _isDownloading || _downloadFinished ? null : _triggerDownload,
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),

          // ── Simulated Download Progress Overlay ────────────────────────
          if (_isDownloading)
            Positioned.fill(
              child: Container(
                color: (isDark ? const Color(0xFF1E201B) : Colors.white).withOpacity(0.92),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.olive),
                        strokeWidth: 4.0,
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Generating Receipt PDF',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Compiling payment signature and transaction metadata...',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, color: AppColors.textLabel, fontWeight: FontWeight.w600),
                      ),
                    ],
                  ),
                ),
              ),
            ),

          // ── Simulated Download Success Overlay ─────────────────────────
          if (_downloadFinished)
            Positioned.fill(
              child: Container(
                color: (isDark ? const Color(0xFF1E201B) : Colors.white).withOpacity(0.92),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.check_circle_outline_rounded,
                        color: AppColors.olive,
                        size: 64,
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Receipt Downloaded!',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Saved as receipt_$shortOrderId.pdf',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 12, color: AppColors.textLabel, fontWeight: FontWeight.w700),
                      ),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReceiptRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 2,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                color: AppColors.textLabel,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
          ),
          Expanded(
            flex: 3,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDottedLine(bool isDark) {
    return LayoutBuilder(
      builder: (BuildContext context, BoxConstraints constraints) {
        final boxWidth = constraints.constrainWidth();
        const dashWidth = 5.0;
        const dashHeight = 1.2;
        final dashCount = (boxWidth / (2 * dashWidth)).floor();
        return Flex(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          direction: Axis.horizontal,
          children: List.generate(dashCount, (_) {
            return SizedBox(
              width: dashWidth,
              height: dashHeight,
              child: DecoratedBox(
                decoration: BoxDecoration(color: isDark ? Colors.white24 : Colors.black12),
              ),
            );
          }),
        );
      },
    );
  }

  Widget _buildBarcodeGraphic(bool isDark, String reference) {
    final list = [2, 4, 1, 3, 2, 5, 1, 4, 2, 1, 3, 2, 4, 1, 2, 5, 2, 1, 3, 4, 1, 2, 3, 5, 2, 1];
    return Column(
      children: [
        Container(
          height: 50,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: list.map((widthMultiplier) {
              return Container(
                width: widthMultiplier * 1.2,
                height: 50,
                color: isDark ? Colors.white60 : Colors.black87,
                margin: const EdgeInsets.only(right: 1.5),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          '* $reference *',
          style: TextStyle(
            fontSize: 10,
            letterSpacing: 4.0,
            fontWeight: FontWeight.bold,
            color: AppColors.textLabel,
          ),
        ),
      ],
    );
  }
}
