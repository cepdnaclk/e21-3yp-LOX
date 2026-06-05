import 'package:flutter/material.dart';

import '../../../core/services/auth_service.dart';
import '../../../data/models/user_profile.dart';

class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    required this.user,
    required this.onLogout,
    required this.authService,
  });

  final UserProfile user;
  final Future<void> Function() onLogout;
  final AuthService authService;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  bool _loading = true;
  bool _saving = false;
  bool _biometricEnabled = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadBiometricState();
  }

  Future<void> _loadBiometricState() async {
    try {
      final enabled = await widget.authService.isBiometricEnabled();
      if (!mounted) {
        return;
      }
      setState(() {
        _biometricEnabled = enabled;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  Future<void> _updateBiometricEnabled(bool value) async {
    if (_saving) {
      return;
    }

    setState(() {
      _saving = true;
      _error = null;
    });

    try {
      if (value) {
        final passed = await widget.authService.promptForBiometric();
        if (!passed) {
          throw Exception('Biometric authentication was not completed.');
        }
      }

      await widget.authService.setBiometricEnabled(value);

      if (!mounted) {
        return;
      }
      setState(() {
        _biometricEnabled = value;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _saving = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  widget.user.name,
                  style: const TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 6),
                Text(widget.user.email),
                const SizedBox(height: 6),
                Text('Role: ${widget.user.role}'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Biometric Security',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 12),
                if (_loading)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 8),
                    child: LinearProgressIndicator(),
                  )
                else
                  SwitchListTile.adaptive(
                    contentPadding: EdgeInsets.zero,
                    value: _biometricEnabled,
                    onChanged: _saving ? null : _updateBiometricEnabled,
                    title: const Text('Enable biometrics'),
                    subtitle: Text(
                      _biometricEnabled
                          ? 'Biometric login is enabled for this device.'
                          : 'Biometric login is currently off.',
                    ),
                  ),
                if (_error != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _error!,
                    style: const TextStyle(
                      color: Colors.redAccent,
                      fontSize: 13,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Implementation Scope',
                  style: TextStyle(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 6),
                const Text(
                  'This build covers location selection, station browsing, locker review and request submission.',
                ),
                const SizedBox(height: 16),
                FilledButton.tonal(
                  onPressed: widget.onLogout,
                  child: const Text('Logout'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}