import 'package:flutter/material.dart';
import '../../../../app/app.dart';
import '../../../../data/local/local_store.dart';
import '../../../../core/theme/app_colors.dart';

class ThemesScreen extends StatelessWidget {
  const ThemesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Themes',
          style: TextStyle(fontWeight: FontWeight.w900),
        ),
        iconTheme: IconThemeData(
          color: theme.colorScheme.onSurface,
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          // Theme Mode (Light / Dark / System) Card
          Card(
            color: theme.colorScheme.surface,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: theme.colorScheme.outlineVariant),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'THEME MODE',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Divider(height: 24),
                  ValueListenableBuilder<ThemeMode>(
                    valueListenable: themeNotifier,
                    builder: (context, currentMode, _) {
                      return Column(
                        children: [
                          _buildModeTile(
                            context,
                            icon: Icons.light_mode_outlined,
                            title: 'Light Theme',
                            mode: ThemeMode.light,
                            currentMode: currentMode,
                          ),
                          const Divider(height: 12),
                          _buildModeTile(
                            context,
                            icon: Icons.dark_mode_outlined,
                            title: 'Dark Theme',
                            mode: ThemeMode.dark,
                            currentMode: currentMode,
                          ),
                          const Divider(height: 12),
                          _buildModeTile(
                            context,
                            icon: Icons.settings_brightness_outlined,
                            title: 'System Default',
                            mode: ThemeMode.system,
                            currentMode: currentMode,
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

          // Theme Preset Color Palettes Card
          Card(
            color: theme.colorScheme.surface,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: theme.colorScheme.outlineVariant),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'COLOR PALETTES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const Divider(height: 24),
                  ValueListenableBuilder<AppThemePreset>(
                    valueListenable: themePresetNotifier,
                    builder: (context, currentPreset, _) {
                      return Column(
                        children: [
                          _buildPresetTile(
                            context,
                            title: 'Olive Green',
                            description: 'Soothing natural olive (Default)',
                            preset: AppThemePreset.olive,
                            currentPreset: currentPreset,
                            primaryColor: const Color(0xFF5C5F3E),
                            secondaryColor: const Color(0xFF6B6E50),
                          ),
                          const Divider(height: 12),
                          _buildPresetTile(
                            context,
                            title: 'Ocean Blue',
                            description: 'Calming Nordic steel blue',
                            preset: AppThemePreset.ocean,
                            currentPreset: currentPreset,
                            primaryColor: const Color(0xFF1E40AF),
                            secondaryColor: const Color(0xFF3B82F6),
                          ),
                          const Divider(height: 12),
                          _buildPresetTile(
                            context,
                            title: 'Sunset Orange',
                            description: 'Warm earthy terracotta rust',
                            preset: AppThemePreset.sunset,
                            currentPreset: currentPreset,
                            primaryColor: const Color(0xFFEA580C),
                            secondaryColor: const Color(0xFFF97316),
                          ),
                          const Divider(height: 12),
                          _buildPresetTile(
                            context,
                            title: 'Forest Green',
                            description: 'Eucalyptus and organic sage',
                            preset: AppThemePreset.forest,
                            currentPreset: currentPreset,
                            primaryColor: const Color(0xFF047857),
                            secondaryColor: const Color(0xFF10B981),
                          ),
                          const Divider(height: 12),
                          _buildPresetTile(
                            context,
                            title: 'Slate Gray',
                            description: 'Premium minimalist cool charcoal',
                            preset: AppThemePreset.slate,
                            currentPreset: currentPreset,
                            primaryColor: const Color(0xFF475569),
                            secondaryColor: const Color(0xFF64748B),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeTile(
    BuildContext context, {
    required IconData icon,
    required String title,
    required ThemeMode mode,
    required ThemeMode currentMode,
  }) {
    final isSelected = currentMode == mode;
    final theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        themeNotifier.value = mode;
        await LocalStore.saveThemeMode(mode);
      },
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            Icon(icon, color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                title,
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                ),
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: theme.colorScheme.primary)
            else
              Icon(Icons.circle_outlined, color: theme.colorScheme.outline),
          ],
        ),
      ),
    );
  }

  Widget _buildPresetTile(
    BuildContext context, {
    required String title,
    required String description,
    required AppThemePreset preset,
    required AppThemePreset currentPreset,
    required Color primaryColor,
    required Color secondaryColor,
  }) {
    final isSelected = currentPreset == preset;
    final theme = Theme.of(context);

    return InkWell(
      onTap: () async {
        themePresetNotifier.value = preset;
        await LocalStore.saveThemePreset(preset.name);
      },
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
        child: Row(
          children: [
            // Colored preview circle container
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [primaryColor, secondaryColor],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                border: Border.all(
                  color: isSelected ? theme.colorScheme.primary : Colors.transparent,
                  width: 2.5,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                      color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                    ),
                  ),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 11,
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Icon(Icons.check_circle, color: theme.colorScheme.primary)
            else
              Icon(Icons.circle_outlined, color: theme.colorScheme.outline),
          ],
        ),
      ),
    );
  }
}
