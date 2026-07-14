import 'package:flutter/material.dart';
import '../../../../../data/local/local_store.dart';
import '../../../../../core/theme/app_colors.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<Map<String, dynamic>> _notifications = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() => _loading = true);
    // Mark all as read when opening the screen
    await LocalStore.markAllNotificationsAsRead();
    final list = await LocalStore.getNotifications();
    // Newest first: sort by timestamp descending
    list.sort((a, b) {
      try {
        final ta = DateTime.parse(a['timestamp'] ?? '');
        final tb = DateTime.parse(b['timestamp'] ?? '');
        return tb.compareTo(ta);
      } catch (_) {
        return 0;
      }
    });
    if (mounted) {
      setState(() {
        _notifications = list;
        _loading = false;
      });
    }
  }

  Future<void> _dismissOne(String id) async {
    await LocalStore.dismissNotification(id);
    setState(() {
      _notifications.removeWhere((n) => n['id']?.toString() == id);
    });
  }

  Future<void> _confirmClearAll() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Clear All Notifications',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18),
        ),
        content: const Text(
          'This will remove all notifications from your view. Your activity history is preserved for admin reporting.',
          style: TextStyle(fontSize: 14, height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text(
              'CANCEL',
              style: TextStyle(
                color: AppColors.textHint,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.8,
              ),
            ),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.olive,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text(
              'CONFIRM',
              style: TextStyle(fontWeight: FontWeight.w700, letterSpacing: 0.8),
            ),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await LocalStore.dismissAllNotifications();
      if (mounted) {
        setState(() => _notifications = []);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('All notifications cleared')),
        );
      }
    }
  }

  String _formatTime(String timestampStr) {
    try {
      final dt = DateTime.parse(timestampStr);
      final diff = DateTime.now().difference(dt);
      if (diff.inMinutes < 1) {
        return 'Just now';
      } else if (diff.inMinutes < 60) {
        return '${diff.inMinutes}m ago';
      } else if (diff.inHours < 24) {
        return '${diff.inHours}h ago';
      } else if (diff.inDays < 7) {
        return '${diff.inDays}d ago';
      } else {
        final d = DateTime.parse(timestampStr);
        return '${d.day}/${d.month}/${d.year}';
      }
    } catch (_) {
      return '';
    }
  }

  IconData _getNotifIcon(String id, String title) {
    final t = title.toLowerCase();
    final idLower = id.toLowerCase();
    // Locker status events injected from request history
    if (idLower.startsWith('req_')) {
      if (t.contains('assigned') || t.contains('approved')) return Icons.lock_open_rounded;
      if (t.contains('rejected')) return Icons.lock_outlined;
      if (t.contains('cancel')) return Icons.cancel_outlined;
      if (t.contains('queue')) return Icons.hourglass_top_rounded;
      if (t.contains('pending')) return Icons.pending_outlined;
      return Icons.receipt_long_outlined;
    }
    // General notifications
    if (t.contains('welcome') || t.contains('lox')) return Icons.celebration_outlined;
    if (t.contains('biometrics') || t.contains('secure') || t.contains('security')) return Icons.shield_outlined;
    if (t.contains('store') || t.contains('shop') || t.contains('purchase')) return Icons.storefront_outlined;
    if (t.contains('locker') || t.contains('unlock') || t.contains('open')) return Icons.lock_open_outlined;
    return Icons.notifications_none_rounded;
  }

  Color _getNotifColor(String id, String title) {
    final t = title.toLowerCase();
    final idLower = id.toLowerCase();
    if (idLower.startsWith('req_')) {
      if (t.contains('assigned') || t.contains('approved')) return const Color(0xFF4CAF50);
      if (t.contains('rejected')) return const Color(0xFFC95454);
      if (t.contains('cancel')) return const Color(0xFFC95454);
      if (t.contains('queue')) return const Color(0xFFD97706);
      if (t.contains('pending')) return const Color(0xFF64B5F6);
    }
    return AppColors.olive;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? theme.scaffoldBackgroundColor : AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        iconTheme: IconThemeData(color: theme.colorScheme.onSurface),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_notifications.isNotEmpty) ...[
            TextButton.icon(
              onPressed: _confirmClearAll,
              icon: const Icon(Icons.delete_sweep_rounded, size: 18),
              label: const Text(
                'Clear All',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
              ),
              style: TextButton.styleFrom(
                foregroundColor: const Color(0xFFC95454),
              ),
            ),
            const SizedBox(width: 4),
          ],
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        color: AppColors.olive,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _notifications.isEmpty
                ? _buildEmptyState(context)
                : ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notif = _notifications[index];
                      return _buildDismissibleCard(context, notif, isDark);
                    },
                  ),
      ),
    );
  }

  Widget _buildDismissibleCard(BuildContext context, Map<String, dynamic> notif, bool isDark) {
    final id = notif['id']?.toString() ?? '';

    return Dismissible(
      key: ValueKey(id),
      direction: DismissDirection.endToStart,
      // Custom slide-to-reveal "Clear" label on the right
      background: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: const Color(0xFFC95454),
          borderRadius: BorderRadius.circular(16),
        ),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            Icon(Icons.delete_outline_rounded, color: Colors.white, size: 24),
            SizedBox(height: 4),
            Text(
              'Clear',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w800,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
          ],
        ),
      ),
      onDismissed: (_) => _dismissOne(id),
      child: _buildNotificationCard(context, notif, isDark),
    );
  }

  Widget _buildNotificationCard(BuildContext context, Map<String, dynamic> notif, bool isDark) {
    final theme = Theme.of(context);
    final isRead = notif['read'] == true;
    final cardColor = isDark ? theme.colorScheme.surface : Colors.white;
    final id = notif['id']?.toString() ?? '';
    final title = notif['title']?.toString() ?? 'Locker Alert';
    final accentColor = _getNotifColor(id, title);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: cardColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isRead
              ? theme.colorScheme.outlineVariant.withOpacity(0.3)
              : accentColor.withOpacity(0.25),
          width: isRead ? 1 : 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category icon
            Container(
              padding: const EdgeInsets.all(9),
              decoration: BoxDecoration(
                color: accentColor.withOpacity(isRead ? 0.07 : 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(
                _getNotifIcon(id, title),
                color: isRead ? accentColor.withOpacity(0.6) : accentColor,
                size: 20,
              ),
            ),
            const SizedBox(width: 14),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: isRead ? FontWeight.w700 : FontWeight.w900,
                            color: isDark ? Colors.white : AppColors.textMain,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        _formatTime(notif['timestamp'] ?? ''),
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    notif['body']?.toString() ?? '',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: theme.colorScheme.onSurfaceVariant.withOpacity(0.85),
                    ),
                  ),
                ],
              ),
            ),

            // Unread dot
            if (!isRead) ...[
              const SizedBox(width: 10),
              Container(
                margin: const EdgeInsets.only(top: 4),
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: accentColor,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 80, horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.notifications_off_outlined,
                size: 64,
                color: theme.colorScheme.onSurfaceVariant.withOpacity(0.3),
              ),
              const SizedBox(height: 16),
              Text(
                'All caught up!',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w800,
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.8),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                'Locker assignments, approvals, rejections and alerts will appear here.',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 13,
                  height: 1.4,
                  color: theme.colorScheme.onSurfaceVariant.withOpacity(0.5),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
