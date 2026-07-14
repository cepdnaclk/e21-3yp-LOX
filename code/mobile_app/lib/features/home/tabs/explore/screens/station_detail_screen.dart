import 'package:flutter/material.dart';

import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../../../../../data/remote/api_client.dart';
import '../../../../../core/theme/theme_style.dart';
import '../widgets/locker_chip.dart';
import '../widgets/stat_card.dart';

class StationDetailScreen extends StatefulWidget {
  const StationDetailScreen({
    super.key,
    required this.client,
    required this.station,
    required this.initialLockers,
    required this.activeRequest,
  });

  final ApiClient client;
  final Station station;
  final List<Locker> initialLockers;
  final AccessRequest? activeRequest;

  @override
  State<StationDetailScreen> createState() => _StationDetailScreenState();
}

class _StationDetailScreenState extends State<StationDetailScreen> {
  late List<Locker> _lockers;
  AccessRequest? _activeRequest;
  bool _loading = false;
  bool _submittingRequest = false;

  @override
  void initState() {
    super.initState();
    _lockers = List<Locker>.from(widget.initialLockers);
    _activeRequest = widget.activeRequest;
  }

  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  Future<void> _refreshLockers() async {
    setState(() => _loading = true);
    try {
      final lockers = await widget.client.fetchLockers(widget.station.id);
      if (!mounted) return;
      setState(() => _lockers = lockers);
    } catch (error) {
      _show(error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestLocker() async {
    final noteController = TextEditingController();
    final note = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request a Locker'),
        content: TextField(
          controller: noteController,
          decoration: const InputDecoration(
            hintText: 'Optional note to local admin',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () =>
                Navigator.of(context).pop(noteController.text.trim()),
            child: const Text('Send Request'),
          ),
        ],
      ),
    );

    if (note == null) return;

    setState(() => _submittingRequest = true);
    try {
      final request = await widget.client.createLockerRequest(
        widget.station.id,
        note,
      );
      if (!mounted) return;
      setState(() => _activeRequest = request);
      _show('Locker request submitted to local admins.');
      Navigator.of(context).pop(true);
    } catch (error) {
      _show(error.toString());
    } finally {
      if (mounted) setState(() => _submittingRequest = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final isLight = !isDark;

    final themeStyle = theme.extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 26,
      buttonRadius: 16,
      fieldRadius: 14,
      navBarBg: theme.colorScheme.surface,
      navBarBlur: 10,
      navBarActiveColor: theme.colorScheme.primary,
      statusGreen: isDark ? const Color(0xFF84CC16) : const Color(0xFF4D7C0F),
      statusYellow: isDark ? const Color(0xFFEAB308) : const Color(0xFFCA8A04),
      statusRed: isDark ? const Color(0xFFEF4444) : const Color(0xFFB91C1C),
    );

    final primaryColor = theme.colorScheme.primary;
    final cardBg = isLight 
        ? Color.lerp(Colors.white, primaryColor, 0.03)! 
        : theme.colorScheme.surface;
    final txtColor = theme.colorScheme.onSurface;
    final mutedColor = isDark 
        ? theme.colorScheme.onSurfaceVariant 
        : theme.colorScheme.onSurfaceVariant.withOpacity(0.7);
    final trackColor = theme.colorScheme.outlineVariant.withOpacity(0.3);

    final freeCount = _lockers.where((l) => !l.isBooked).length;
    final reservedCount = _lockers.length - freeCount;
    final canRequest = _activeRequest == null;

    final Color statusColor;
    if (freeCount > 0) {
      statusColor = themeStyle.statusGreen;
    } else if (_lockers.isNotEmpty && freeCount == 0) {
      statusColor = themeStyle.statusYellow;
    } else {
      statusColor = themeStyle.statusRed;
    }

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: IconThemeData(color: txtColor),
      ),
      body: RefreshIndicator(
        onRefresh: _refreshLockers,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              decoration: BoxDecoration(
                color: cardBg,
                borderRadius: BorderRadius.circular(themeStyle.cardRadius),
                border: Border.all(
                  color: primaryColor.withOpacity(isLight ? 0.12 : 0.25),
                  width: 1.2,
                ),
                boxShadow: themeStyle.cardShadow ?? [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.06),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: statusColor.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: statusColor.withOpacity(0.2),
                            width: 1.2,
                          ),
                        ),
                        child: Icon(
                          freeCount > 0 ? Icons.lock_open_rounded : Icons.lock_rounded,
                          color: statusColor,
                        ),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              widget.station.name,
                              style: TextStyle(
                                fontSize: 22,
                                fontWeight: FontWeight.w900,
                                color: txtColor,
                              ),
                            ),
                            Text(
                              ' Hours: ${widget.station.openTime} - ${widget.station.closeTime}',
                              style: TextStyle(
                                color: mutedColor,
                                fontWeight: FontWeight.w800,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),

                  Text(
                    '$freeCount / ${_lockers.length} available',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      color: statusColor,
                    ),
                  ),
                  const SizedBox(height: 8),

                  ClipRRect(
                    borderRadius: BorderRadius.circular(999),
                    child: LinearProgressIndicator(
                      value: _lockers.isEmpty
                          ? 0.0
                          : (freeCount / _lockers.length).clamp(0.0, 1.0),
                      minHeight: 8,
                      backgroundColor: trackColor,
                      valueColor: AlwaysStoppedAnimation(statusColor),
                    ),
                  ),
                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: StatCard(
                          label: 'Available',
                          value: freeCount.toString(),
                          color: themeStyle.statusGreen.withOpacity(isDark ? 0.15 : 0.08),
                          borderColor: themeStyle.statusGreen.withOpacity(isDark ? 0.35 : 0.2),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: StatCard(
                          label: 'Reserved',
                          value: reservedCount.toString(),
                          color: themeStyle.statusRed.withOpacity(isDark ? 0.15 : 0.08),
                          borderColor: themeStyle.statusRed.withOpacity(isDark ? 0.35 : 0.2),
                        ),
                      ),
                    ],
                  ),

                  if (_activeRequest != null) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.surfaceContainerHigh,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        'Request status: ${_activeRequest!.status}',
                        style: TextStyle(
                          fontWeight: FontWeight.w700,
                          color: txtColor,
                        ),
                      ),
                    ),
                  ],

                  const SizedBox(height: 16),

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                        backgroundColor: primaryColor,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(themeStyle.buttonRadius),
                        ),
                      ),
                      onPressed: !_submittingRequest && canRequest
                          ? _requestLocker
                          : null,
                      child: _submittingRequest
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: Colors.white,
                              ),
                            )
                          : Text(
                              canRequest
                                  ? 'Request Locker'
                                  : 'Request ${_activeRequest!.status}',
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                                fontSize: 15,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'LOCKERS',
                  style: TextStyle(
                    color: mutedColor,
                    fontSize: 12,
                    letterSpacing: 2.2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            if (_loading)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_lockers.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24),
                child: Center(
                  child: Text('No lockers found for this station.'),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _lockers.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 1.3,
                ),
                itemBuilder: (context, index) {
                  return LockerChip(locker: _lockers[index]);
                },
              ),
          ],
        ),
      ),
    );
  }
}
