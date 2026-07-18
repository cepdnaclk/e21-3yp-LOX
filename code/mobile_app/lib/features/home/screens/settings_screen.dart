import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../../data/models/user_profile.dart';
import '../../../data/remote/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/services/biometric_service.dart';
import '../../../data/local/local_store.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({
    super.key,
    required this.user,
    required this.client,
    required this.onProfileUpdated,
    required this.onLogout,
  });

  final UserProfile user;
  final ApiClient client;
  final ValueChanged<UserProfile> onProfileUpdated;
  final Future<void> Function() onLogout;

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _biometricEnabled = false;
  bool _deviceSupportsBiometrics = false;
  bool _notificationsEnabled = true;
  bool _locationEnabled = false;

  @override
  void initState() {
    super.initState();
    _loadBiometricSettings();
    _loadLocationSettings();
  }

  Future<void> _loadLocationSettings() async {
    final hasPref = await LocalStore.isLocationEnabled();
    final permission = await Geolocator.checkPermission();
    final isGranted = permission == LocationPermission.whileInUse ||
        permission == LocationPermission.always;
    setState(() {
      _locationEnabled = hasPref && isGranted;
    });
  }

  Future<void> _loadBiometricSettings() async {
    final supports = await BiometricService.instance.canAuthenticate();
    final enabled = await BiometricService.instance.isBiometricEnabled();
    setState(() {
      _deviceSupportsBiometrics = supports;
      _biometricEnabled = enabled;
    });
  }

  Future<void> _toggleLocationAccess(bool val) async {
    if (val) {
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location services are disabled on this device.'),
            ),
          );
        }
        setState(() {
          _locationEnabled = false;
        });
        return;
      }

      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }

      if (perm == LocationPermission.whileInUse ||
          perm == LocationPermission.always) {
        await LocalStore.setLocationEnabled(true);
        setState(() {
          _locationEnabled = true;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location access enabled successfully.'),
            ),
          );
        }
      } else if (perm == LocationPermission.deniedForever) {
        setState(() {
          _locationEnabled = false;
        });
        if (mounted) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: const Text(
                'Location Permission Required',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              content: Text(
                'Location permissions are permanently denied. Please enable them in your device settings.',
                style: TextStyle(fontSize: 14, color: AppColors.textLabel),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    await Geolocator.openAppSettings();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.olive,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text('OPEN SETTINGS'),
                ),
              ],
            ),
          );
        }
      } else {
        setState(() {
          _locationEnabled = false;
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location permission denied.'),
            ),
          );
        }
      }
    } else {
      await LocalStore.setLocationEnabled(false);
      await LocalStore.saveLocation('');
      setState(() {
        _locationEnabled = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Location access disabled in app. You can also revoke system permissions in settings.'),
            action: SnackBarAction(
              label: 'SETTINGS',
              onPressed: () async {
                await Geolocator.openAppSettings();
              },
            ),
          ),
        );
      }
    }
  }

  Future<void> _disableBiometrics() async {
    await BiometricService.instance.clearCredentials();
    setState(() {
      _biometricEnabled = false;
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Biometric authentication disabled.'),
        ),
      );
    }
  }

  Future<void> _enableBiometrics() async {
    final passwordController = TextEditingController();
    bool checking = false;
    String? errorMsg;

    await showDialog(
      context: context,
      barrierDismissible: true,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              title: const Text(
                'Confirm Password',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Enter your password to enable biometric login.',
                    style: TextStyle(fontSize: 14, color: AppColors.textLabel),
                  ),
                  const SizedBox(height: 16),
                  TextField(
                    controller: passwordController,
                    obscureText: true,
                    decoration: InputDecoration(
                      hintText: 'Password',
                      errorText: errorMsg,
                      prefixIcon: const Icon(Icons.vpn_key_outlined),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('CANCEL'),
                ),
                ElevatedButton(
                  onPressed: checking
                      ? null
                      : () async {
                          final password = passwordController.text;
                          if (password.isEmpty) {
                            setDialogState(() {
                              errorMsg = 'Password cannot be empty.';
                            });
                            return;
                          }

                          setDialogState(() {
                            checking = true;
                            errorMsg = null;
                          });

                          try {
                            // Test credentials by hitting login endpoint
                            final baseUrl = widget.client.baseUrl;
                            final authClient = ApiClient(baseUrl: baseUrl, token: '');
                            await authClient.login(
                              email: widget.user.email,
                              password: password,
                            );

                            // Credentials are correct! Prompt for biometrics
                            final authenticated = await BiometricService.instance.authenticate(
                              'Confirm your biometrics to enable fingerprint login',
                            );

                            if (authenticated) {
                              await BiometricService.instance.saveCredentials(
                                widget.user.email,
                                password,
                              );
                              await BiometricService.instance.setBiometricEnabled(true);
                              if (!context.mounted) return;
                              setState(() {
                                _biometricEnabled = true;
                              });
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Biometric authentication enabled successfully.'),
                                ),
                              );
                              if (Navigator.canPop(context)) {
                                Navigator.pop(context);
                              }
                            } else {
                              setDialogState(() {
                                checking = false;
                                errorMsg = 'Biometric verification failed.';
                              });
                            }
                          } catch (e) {
                            setDialogState(() {
                              checking = false;
                              errorMsg = 'Invalid password or connection error.';
                            });
                          }
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.olive,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: checking
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('CONFIRM'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Settings',
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
          // Security Settings Card
          Card(
            color: theme.colorScheme.surface,
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: BorderSide(color: theme.colorScheme.outlineVariant.withOpacity(0.5)),
            ),
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'SECURITY & PREFERENCES',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1.4,
                      color: theme.colorScheme.onSurfaceVariant.withOpacity(0.7),
                    ),
                  ),
                  const Divider(height: 24),
                  if (_deviceSupportsBiometrics) ...[
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Icon(Icons.fingerprint_rounded, color: theme.colorScheme.primary, size: 24),
                            const SizedBox(width: 14),
                            const Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Biometric Login',
                                  style: TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                SizedBox(height: 2),
                                Text(
                                  'Fingerprint/face access',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        Switch.adaptive(
                          value: _biometricEnabled,
                          activeColor: theme.colorScheme.primary,
                          onChanged: (val) {
                            if (val) {
                              _enableBiometrics();
                            } else {
                              _disableBiometrics();
                            }
                          },
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                  ],
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.notifications_none_rounded, color: theme.colorScheme.primary, size: 24),
                          const SizedBox(width: 14),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Push Notifications',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Receive alert notifications',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Switch.adaptive(
                        value: _notificationsEnabled,
                        activeColor: theme.colorScheme.primary,
                        onChanged: (val) {
                          setState(() {
                            _notificationsEnabled = val;
                          });
                        },
                      ),
                    ],
                  ),
                  const Divider(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.location_on_outlined, color: theme.colorScheme.primary, size: 24),
                          const SizedBox(width: 14),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Location Access',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Enable location-based services',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      Switch.adaptive(
                        value: _locationEnabled,
                        activeColor: theme.colorScheme.primary,
                        onChanged: (val) {
                          _toggleLocationAccess(val);
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 24),

        ],
      ),
    );
  }

  Widget _buildSystemInfoItem(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
