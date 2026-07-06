import 'package:flutter/material.dart';
import '../../../data/models/user_profile.dart';
import '../../../data/remote/api_client.dart';
import '../tabs/account/screens/account_screen.dart';
import '../tabs/explore/screens/notification_screen.dart';
import '../screens/payment_history_screen.dart';
import '../screens/settings_screen.dart';
import '../screens/themes_screen.dart';

class SideMenuDrawer extends StatelessWidget {
  const SideMenuDrawer({
    super.key,
    required this.user,
    required this.client,
    required this.onProfileUpdated,
    required this.onLogout,
    this.onSettingsDismissed,
  });

  final UserProfile user;
  final ApiClient client;
  final ValueChanged<UserProfile> onProfileUpdated;
  final Future<void> Function() onLogout;
  final VoidCallback? onSettingsDismissed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasAvatar = user.avatarUrl.isNotEmpty;

    return Drawer(
      width: MediaQuery.of(context).size.width * 0.75,
      child: SafeArea(
        child: Column(
          children: [
            // ── Profile Header ──────────────────────────────────
            InkWell(
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => AccountScreen(
                      user: user,
                      client: client,
                      onProfileUpdated: onProfileUpdated,
                      onLogout: onLogout,
                    ),
                  ),
                );
              },
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 32,
                      backgroundColor: theme.colorScheme.surfaceContainerHighest,
                      backgroundImage: hasAvatar ? NetworkImage(user.avatarUrl) : null,
                      child: !hasAvatar
                          ? Icon(Icons.person, size: 32, color: theme.colorScheme.onSurfaceVariant)
                          : null,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'View Profile',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right_rounded,
                      color: theme.colorScheme.onSurfaceVariant.withOpacity(0.4),
                    ),
                  ],
                ),
              ),
            ),

            const Divider(height: 1),

            // ── Menu Items ──────────────────────────────────────
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  // ── Activity ────────────────────────────────
                  _buildSectionLabel(context, 'ACTIVITY'),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.notifications_none_rounded,
                    label: 'Notifications',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const NotificationScreen(),
                        ),
                      );
                    },
                  ),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.receipt_long_outlined,
                    label: 'Payment History',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => PaymentHistoryScreen(client: client),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 8),
                  const Divider(indent: 24, endIndent: 24),
                  const SizedBox(height: 8),

                  // ── Preferences ──────────────────────────────
                  _buildSectionLabel(context, 'PREFERENCES'),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.settings_outlined,
                    label: 'Settings',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => SettingsScreen(
                            user: user,
                            client: client,
                            onProfileUpdated: onProfileUpdated,
                            onLogout: onLogout,
                          ),
                        ),
                      ).then((_) {
                        onSettingsDismissed?.call();
                      });
                    },
                  ),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.palette_outlined,
                    label: 'Themes',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => const ThemesScreen(),
                        ),
                      );
                    },
                  ),

                  const SizedBox(height: 8),
                  const Divider(indent: 24, endIndent: 24),
                  const SizedBox(height: 8),

                  // ── Account ──────────────────────────────────
                  _buildSectionLabel(context, 'ACCOUNT'),
                  _buildDrawerItem(
                    context: context,
                    icon: Icons.logout_rounded,
                    label: 'Logout',
                    color: Colors.redAccent,
                    showTrailing: false,
                    onTap: () {
                      Navigator.pop(context);
                      onLogout();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionLabel(BuildContext context, String label) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 16, 24, 8),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.6,
          color: theme.colorScheme.onSurfaceVariant.withOpacity(0.55),
        ),
      ),
    );
  }

  Widget _buildDrawerItem({
    required BuildContext context,
    required IconData icon,
    required String label,
    required VoidCallback onTap,
    Color? color,
    bool showTrailing = true,
  }) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: ListTile(
        leading: Icon(
          icon,
          color: color ?? theme.colorScheme.onSurface.withOpacity(0.7),
          size: 22,
        ),
        title: Text(
          label,
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w600,
            color: color ?? theme.colorScheme.onSurface,
          ),
        ),
        trailing: showTrailing
            ? Icon(
                Icons.chevron_right_rounded,
                color: color?.withOpacity(0.5) ?? theme.colorScheme.onSurfaceVariant.withOpacity(0.3),
                size: 20,
              )
            : null,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        onTap: onTap,
      ),
    );
  }
}
