import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../../../data/models/product.dart';
import '../../../../../data/models/order.dart';
import '../../../../../data/models/user_profile.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/app_colors.dart';
import 'product_detail_screen.dart';

class StoreScreen extends StatefulWidget {
  const StoreScreen({
    super.key,
    required this.client,
    required this.user,
  });

  final ApiClient client;
  final UserProfile user;

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> with WidgetsBindingObserver {
  // Store Data State
  List<Product> _products = [];
  bool _loading = false;
  String? _error;

  // Search & Filters State
  String _searchQuery = '';
  String _selectedCategory = 'All';
  String _sortMode = 'best-match'; // best-match, price-low, price-high, top-rated, best-seller

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _loadStoreData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint('LoX App Resumed: auto-refreshing store data...');
      _loadStoreData();
    }
  }

  Future<void> _loadStoreData() async {
    if (mounted) setState(() => _loading = true);
    try {
      final products = await widget.client.fetchProducts();
      if (mounted) {
        setState(() {
          _products = products;
          _error = null;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  List<String> get _categories {
    final list = _products.map((p) => p.category).toSet().toList();
    list.sort();
    return ['All', ...list];
  }

  List<Product> get _filteredProducts {
    var list = _products.where((p) {
      final query = _searchQuery.toLowerCase().trim();
      final matchesSearch = query.isEmpty ||
          p.name.toLowerCase().contains(query) ||
          p.description.toLowerCase().contains(query) ||
          p.category.toLowerCase().contains(query);

      final matchesCategory =
          _selectedCategory == 'All' || p.category == _selectedCategory;

      return matchesSearch && matchesCategory;
    }).toList();

    // Sorting
    if (_sortMode == 'price-low') {
      list.sort((a, b) => a.price.compareTo(b.price));
    } else if (_sortMode == 'price-high') {
      list.sort((a, b) => b.price.compareTo(a.price));
    } else if (_sortMode == 'top-rated') {
      list.sort((a, b) => b.rating.compareTo(a.rating));
    } else if (_sortMode == 'best-seller') {
      list.sort((a, b) => b.sold.compareTo(a.sold));
    }

    return list;
  }

  void _openProduct(Product product) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ProductDetailScreen(
          client: widget.client,
          product: product,
          user: widget.user,
        ),
      ),
    );
    if (result == true) {
      _loadStoreData();
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
          'Locker Store',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadStoreData,
          color: AppColors.olive,
          child: _loading && _products.isEmpty
              ? const Center(child: CircularProgressIndicator())
              : _error != null
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(_error!, textAlign: TextAlign.center),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: _loadStoreData,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    )
                  : _buildMarketplaceCatalog(),
        ),
      ),
    );
  }

  Widget _buildMarketplaceCatalog() {
    final filtered = _filteredProducts;

    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      children: [
        // Search Input
        Container(
          margin: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: AppColors.fieldBackground,
            borderRadius: BorderRadius.circular(14),
          ),
          child: TextField(
            onChanged: (val) => setState(() => _searchQuery = val),
            style: const TextStyle(fontWeight: FontWeight.w600),
            decoration: InputDecoration(
              hintText: 'Search products...',
              prefixIcon: Icon(Icons.search, color: AppColors.textLabel),
              border: InputBorder.none,
              contentPadding: EdgeInsets.symmetric(vertical: 14, horizontal: 16),
            ),
          ),
        ),

        // Sort Row Selector
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Sort by',
              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLabel),
            ),
            DropdownButton<String>(
              value: _sortMode,
              underline: const SizedBox(),
              icon: Icon(Icons.arrow_drop_down, color: AppColors.olive),
              style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.olive),
              onChanged: (val) {
                if (val != null) setState(() => _sortMode = val);
              },
              items: const [
                DropdownMenuItem(value: 'best-match', child: Text('Best Match')),
                DropdownMenuItem(value: 'price-low', child: Text('Price: Low to High')),
                DropdownMenuItem(value: 'price-high', child: Text('Price: High to Low')),
                DropdownMenuItem(value: 'top-rated', child: Text('Top Rated')),
                DropdownMenuItem(value: 'best-seller', child: Text('Best Sellers')),
              ],
            ),
          ],
        ),

        // Category Pills
        SizedBox(
          height: 38,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: _categories.map((cat) {
              final isSel = _selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  label: Text(
                    cat,
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: isSel ? Colors.white : AppColors.textLabel,
                    ),
                  ),
                  selected: isSel,
                  selectedColor: AppColors.olive,
                  backgroundColor: AppColors.fieldBackground,
                  checkmarkColor: Colors.white,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                ),
              );
            }).toList(),
          ),
        ),

        const SizedBox(height: 16),

        // Products Catalog Grid
        if (filtered.isEmpty)
          Padding(
            padding: EdgeInsets.symmetric(vertical: 64),
            child: Center(
              child: Text(
                'No products found matching filters.',
                style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textLabel),
              ),
            ),
          )
        else
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 0.74,
            ),
            itemBuilder: (context, index) {
              final product = filtered[index];
              return _buildProductCard(product);
            },
          ),

        const SizedBox(height: 100),
      ],
    );
  }

  Widget _buildProductCard(Product product) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final cardBg = isDark ? (theme.cardTheme.color ?? const Color(0xFF31332B)) : Colors.white;
    final borderColor = isDark ? Colors.white.withOpacity(0.08) : Colors.black.withOpacity(0.05);
    final hasComparePrice = product.compareAtPrice > product.price;

    return GestureDetector(
      onTap: () => _openProduct(product),
      child: Container(
        decoration: BoxDecoration(
          color: cardBg,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: borderColor),
          boxShadow: isDark
              ? []
              : [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: isDark ? Colors.white.withOpacity(0.04) : AppColors.fieldBackground.withOpacity(0.4),
                  ),
                  child: Stack(
                    children: [
                      Positioned.fill(
                        child: _buildProductImage(product, size: 48),
                      ),
                      if (product.badge.isNotEmpty)
                        Positioned(
                          top: 10,
                          left: 10,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: theme.primaryColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              product.badge.toUpperCase(),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.category.toUpperCase(),
                    style: TextStyle(
                      fontSize: 9,
                      fontWeight: FontWeight.w800,
                      color: isDark ? Colors.white60 : AppColors.textLabel,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: isDark ? Colors.white : AppColors.textMain,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Rs. ${product.price.round()}',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                              color: isDark ? theme.colorScheme.primary : AppColors.olive,
                            ),
                          ),
                          if (hasComparePrice)
                            Text(
                              'Rs. ${product.compareAtPrice.round()}',
                              style: TextStyle(
                                fontSize: 11,
                                decoration: TextDecoration.lineThrough,
                                color: isDark ? Colors.white38 : AppColors.textMuted,
                              ),
                            ),
                        ],
                      ),
                      Row(
                        children: [
                          const Icon(Icons.star, color: Color(0xFFF1C40F), size: 14),
                          const SizedBox(width: 2),
                          Text(
                            product.rating.toString(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white70 : AppColors.textMain,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getArtIcon(String style) {
    switch (style) {
      case 'rfid':
        return Icons.contactless_outlined;
      case 'book':
        return Icons.menu_book_outlined;
      case 'safe':
        return Icons.lock_outline;
      case 'drawer':
        return Icons.inbox_outlined;
      case 'wall':
        return Icons.domain_outlined;
      case 'coin':
        return Icons.monetization_on_outlined;
      default:
        return Icons.lock;
    }
  }

  Widget _buildProductImage(Product product, {double size = 48}) {
    final imageUrl = product.imageUrl.trim();
    if (imageUrl.isEmpty) {
      return _buildFallbackIcon(product, size);
    }

    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return Image.network(
        imageUrl,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
        errorBuilder: (context, error, stackTrace) => _buildFallbackIcon(product, size),
      );
    }

    if (imageUrl.startsWith('data:image/svg+xml')) {
      try {
        String svgString;
        if (imageUrl.contains(';base64,')) {
          final base64Str = imageUrl.split(';base64,')[1];
          svgString = utf8.decode(base64.decode(base64Str));
        } else {
          final parts = imageUrl.split(',');
          if (parts.length > 1) {
            svgString = Uri.decodeComponent(parts.sublist(1).join(','));
          } else {
            svgString = '';
          }
        }
        if (svgString.isNotEmpty) {
          return SvgPicture.string(
            svgString,
            fit: BoxFit.cover,
            width: double.infinity,
            height: double.infinity,
          );
        }
      } catch (_) {}
    }

    if (imageUrl.startsWith('data:image/') && imageUrl.contains(';base64,')) {
      try {
        final base64Str = imageUrl.split(';base64,')[1];
        final bytes = base64.decode(base64Str);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          width: double.infinity,
          height: double.infinity,
        );
      } catch (_) {}
    }

    // Try decoding as raw base64
    try {
      final bytes = base64.decode(imageUrl);
      return Image.memory(
        bytes,
        fit: BoxFit.cover,
        width: double.infinity,
        height: double.infinity,
      );
    } catch (_) {}

    return _buildFallbackIcon(product, size);
  }

  Widget _buildFallbackIcon(Product product, double size) {
    return Center(
      child: Icon(
        _getArtIcon(product.artStyle),
        size: size,
        color: AppColors.olive.withOpacity(0.7),
      ),
    );
  }

}
