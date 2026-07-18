import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';

import '../../../../../data/models/access_request.dart';
import '../../../../../data/models/locker.dart';
import '../../../../../data/models/station.dart';
import '../widgets/location_pill.dart';
import '../widgets/station_card.dart';
import '../../../../../core/services/biometric_service.dart';
import '../../../../../data/local/local_store.dart';
import 'notification_screen.dart';
import '../../../../../core/theme/theme_style.dart';

/// Defines the available sorting strategies for the stations list.
enum HomeStationSort { distance, availability }

/// A core UI component that displays a scrollable, sortable list of locker stations.
///
/// This view allows users to detect their current location, sort nearby stations
/// by distance or locker availability, and navigate to a specific station's details.

class StationsView extends StatefulWidget {
  const StationsView({
    super.key,
    required this.stations,
    required this.lockersByStation,
    required this.locationDraft,
    required this.savedLocation,
    required this.savingLocation,
    required this.onLocationChanged,
    required this.onSaveLocation,
    required this.activeRequestForStation,
    required this.freeCountForStation,
    required this.onOpenStation,
    required this.onRefresh,
    this.onGoToProfile,
  });

  /// The master list of all available stations.
  final List<Station> stations;

  final Map<String, List<Locker>> lockersByStation;
  final String locationDraft;
  final String savedLocation;
  final bool savingLocation;
  final ValueChanged<String> onLocationChanged;
  final Future<void> Function() onSaveLocation;
  final AccessRequest? Function(String stationId) activeRequestForStation;
  final int Function(String stationId) freeCountForStation;
  final Future<void> Function(Station station) onOpenStation;
  final Future<void> Function() onRefresh;
  final VoidCallback? onGoToProfile;

  @override
  State<StationsView> createState() => _StationsViewState();
}

class _StationsViewState extends State<StationsView> {
  bool _promptShown = false;
  bool _filtersExpanded = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _checkAndShowBiometricPrompt();
    });
    LocalStore.refreshUnreadCount();
  }

  Future<void> _openNotifications() async {
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => const NotificationScreen(),
      ),
    );
    await LocalStore.refreshUnreadCount();
  }

  Future<void> _checkAndShowBiometricPrompt() async {
    if (_promptShown) return;

    final isEnabled = await BiometricService.instance.isBiometricEnabled();
    if (isEnabled) return;

    final canAuth = await BiometricService.instance.canAuthenticate();
    if (!canAuth) return;

    _promptShown = true;

    if (!mounted) return;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return Dialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          elevation: 0,
          backgroundColor: Colors.transparent,
          child: Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              shape: BoxShape.rectangle,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.1),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF64674B).withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.fingerprint_rounded,
                    color: Color(0xFF64674B),
                    size: 48,
                  ),
                ),
                const SizedBox(height: 20),
                const Text(
                  'Enable Biometrics',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: Color(0xFF1F1E1B),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'Enable biometrics in the profile screen to make your locker more secure.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: Color(0xFFA6A39B),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: () => Navigator.pop(context),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFFA6A39B),
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: const Text(
                          'MAYBE LATER',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: () {
                          Navigator.pop(context);
                          if (widget.onGoToProfile != null) {
                            widget.onGoToProfile!();
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF64674B),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        child: const Text(
                          'ENABLE',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 1.1,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }



  /// The current active sorting method (defaults to distance).
  HomeStationSort _sort = HomeStationSort.distance;

  /// The user's exact GPS coordinates, populated after location detection.
  Position? _currentPosition;

  /// Indicates if the device is currently fetching GPS and geocoding data.
  bool _locLoading = false;

  /// Requests hardware location permissions and retrieves the user's current coordinates.
  ///
  /// Automatically attempts to reverse-geocode the coordinates into a human-readable
  /// city and country (e.g., "Colombo, Sri Lanka") to display in the UI.
  Future<void> _pickCurrentLocation() async {
    setState(() => _locLoading = true);
    try {
      // Verify app settings permission is enabled
      final appLocPref = await LocalStore.isLocationEnabled();
      if (!appLocPref) {
        _show('Location access is disabled in Settings.');
        return;
      }

      // Verify hardware services are active
      final enabled = await Geolocator.isLocationServiceEnabled();
      if (!enabled) { _show('Location services are disabled.'); return; }

      // Check and request app permissions
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied ||
          perm == LocationPermission.deniedForever) {
        _show('Location permission denied.');
        return;
      }

      // Fetch high-accuracy GPS coordinates
      final pos = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.high),
      );

      String label = 'Current location';
      try {
        final placemarks =
            await placemarkFromCoordinates(pos.latitude, pos.longitude);
        if (placemarks.isNotEmpty) {
          final place = placemarks.first;
          final city =
              (place.locality ?? place.subAdministrativeArea ?? '').trim();
          final country = (place.country ?? '').trim();
          final parts =
              [city, country].where((v) => v.isNotEmpty).toList();
          if (parts.isNotEmpty) label = parts.join(', ');
        }
      } catch (_) {}

      if (!mounted) return;

      // Update state and trigger parent callbacks to save the new location
      setState(() => _currentPosition = pos);
      widget.onLocationChanged(label);
      await widget.onSaveLocation();
    } catch (error) {
      _show(error.toString());
    } finally {
      if (mounted) setState(() => _locLoading = false);
    }
  }

  /// Displays a bottom sheet allowing the user to opt into using their device location.
  void _showLocationSheet() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.fromLTRB(16, 10, 16, 18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handlebar for the bottom sheet
            Container(
              width: 42, height: 5,
              decoration: BoxDecoration(
                color: const Color(0xFFE1DED7),
                borderRadius: BorderRadius.circular(99),
              ),
            ),
            const SizedBox(height: 14),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('Select location',
                  style: TextStyle(
                      fontSize: 18, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(height: 10),
            ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFE7E4DD),
                child: Icon(Icons.my_location_rounded,
                    color: Color(0xFF5B5A3D)),
              ),
              title: const Text('Use current location',
                  style: TextStyle(fontWeight: FontWeight.w700)),
              subtitle: const Text(
                  'We will sort nearby stations by distance'),
              onTap: () async {
                Navigator.pop(context); // Close sheet before starting async work
                await _pickCurrentLocation();
              },
            ),
            const SizedBox(height: 6),
          ],
        ),
      ),
    );
  }


  void _show(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
        .showSnackBar(SnackBar(content: Text(msg)));
  }

  /// Calculates the straight-line distance in meters from the user to the [station].
  /// Returns null if the user's position or the station's coordinates are unavailable.
  double? _distanceMeters(Station station) {
    final pos = _currentPosition;
    if (pos == null) return null;
    if (station.latitude == null || station.longitude == null) return null;
    return Geolocator.distanceBetween(
      pos.latitude, pos.longitude,
      station.latitude!, station.longitude!,
    );
  }

  /// Formats a raw distance in meters into a human-readable string .
  /// (e.g., "850 m" or "2.4 km").
  String _distanceLabel(double meters) {
    if (meters < 1000) return '${meters.round()} m';
    return '${(meters / 1000.0).toStringAsFixed(1)} km';
  }

  /// Returns a new list of stations sorted by the currently selected [HomeStationSort] criteria.
  List<Station> get _sortedStations {
    final sorted = [...widget.stations];
    sorted.sort((a, b) {
      if (_sort == HomeStationSort.availability) {
        return widget.freeCountForStation(b.id)
            .compareTo(widget.freeCountForStation(a.id));
      }
      final da = _distanceMeters(a);
      final db = _distanceMeters(b);
      if (da == null && db == null) return 0;
      if (da == null) return 1;
      if (db == null) return -1;
      return da.compareTo(db);
    });
    return sorted;
  }


  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final mutedColor = theme.colorScheme.onSurfaceVariant.withOpacity(0.7);
    final txtColor = theme.colorScheme.onSurface;

    final activeLocationText = widget.locationDraft.trim().isEmpty
        ? (widget.savedLocation.trim().isEmpty
            ? 'Tap to set location'
            : widget.savedLocation.trim())
        : widget.locationDraft.trim();

    final sorted = _sortedStations;

    final themeStyle = theme.extension<AppThemeStyle>();
    final isLuxuryGreen = themeStyle != null && themeStyle.statusGreen == const Color(0xFF6D9773) && themeStyle.statusYellow == const Color(0xFFFFBA00);

    return Container(
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: const BoxDecoration(
              color: Colors.transparent,
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 20),
              child: SafeArea(
                bottom: false,
                child: LocationPill(
                  label: _locLoading
                      ? 'Detecting location…'
                      : activeLocationText,
                  loading: _locLoading,
                  onTap: _locLoading ? null : _showLocationSheet,
                ),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                // Title & controls section
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        'All Stations',
                        style: TextStyle(
                          fontSize: 30,
                          fontWeight: FontWeight.w900,
                          color: txtColor,
                        ),
                      ),
                    ),
                    GestureDetector(
                      onTap: () {
                        setState(() {
                          _filtersExpanded = !_filtersExpanded;
                        });
                      },
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: _filtersExpanded
                              ? theme.colorScheme.primary
                              : theme.colorScheme.primary.withOpacity(0.08),
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: theme.colorScheme.primary.withOpacity(0.2),
                            width: 1.2,
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.tune_rounded,
                              color: _filtersExpanded ? Colors.white : theme.colorScheme.primary,
                              size: 18,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              _sort == HomeStationSort.distance ? 'Distance' : 'Availability',
                              style: TextStyle(
                                color: _filtersExpanded ? Colors.white : theme.colorScheme.primary,
                                fontSize: 13,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    ValueListenableBuilder<int>(
                      valueListenable: LocalStore.unreadCountNotifier,
                      builder: (context, count, _) {
                        return GestureDetector(
                          onTap: _openNotifications,
                          child: Stack(
                            clipBehavior: Clip.none,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: theme.colorScheme.primary.withOpacity(0.08),
                                  shape: BoxShape.circle,
                                  border: Border.all(
                                    color: theme.colorScheme.primary.withOpacity(0.2),
                                    width: 1.2,
                                  ),
                                ),
                                child: Icon(
                                  Icons.notifications_none_rounded,
                                  color: theme.colorScheme.primary,
                                  size: 18,
                                ),
                              ),
                              if (count > 0)
                                Positioned(
                                  right: 0,
                                  top: 0,
                                  child: Container(
                                    width: 8,
                                    height: 8,
                                    decoration: const BoxDecoration(
                                      color: Colors.redAccent,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                AnimatedSize(
                  duration: const Duration(milliseconds: 250),
                  curve: Curves.easeInOut,
                  child: _filtersExpanded
                      ? Padding(
                          padding: const EdgeInsets.only(bottom: 16),
                          child: Row(
                            children: [
                              _buildFilterOptionChip(
                                label: 'Distance',
                                icon: Icons.map_outlined,
                                selected: _sort == HomeStationSort.distance,
                                onTap: () {
                                  setState(() {
                                    _sort = HomeStationSort.distance;
                                  });
                                },
                              ),
                              const SizedBox(width: 10),
                              _buildFilterOptionChip(
                                label: 'High Availability',
                                icon: Icons.check_circle_outline_rounded,
                                selected: _sort == HomeStationSort.availability,
                                onTap: () {
                                  setState(() {
                                    _sort = HomeStationSort.availability;
                                  });
                                },
                              ),
                            ],
                          ),
                        )
                      : const SizedBox.shrink(),
                ),
              ],
            ),
          ),

          // Scrollable list
          Expanded(
            child: Stack(
              children: [
                RefreshIndicator(
                  onRefresh: widget.onRefresh,
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(20, 12, 20, 90),
                    itemCount: sorted.isEmpty ? 1 : sorted.length,
                    itemBuilder: (context, index) {
                      if (sorted.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.only(top: 40),
                          child: Center(
                            child: Text(
                              'No stations found.',
                              style: TextStyle(
                                color: mutedColor,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        );
                      }

                      final station = sorted[index];
                      final total = widget.lockersByStation[station.id]?.length ?? 0;
                      final free = widget.freeCountForStation(station.id);
                      final dist = _distanceMeters(station);

                      return Padding(
                        padding: const EdgeInsets.only(bottom: 14),
                        child: StationCard(
                          station: station,
                          total: total,
                          free: free,
                          distanceLabel: dist == null ? null : _distanceLabel(dist),
                          onTap: () => widget.onOpenStation(station),
                        ),
                      );
                    },
                  ),
                ),
                Positioned(
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 24,
                  child: IgnorePointer(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Theme.of(context).scaffoldBackgroundColor,
                            Theme.of(context).scaffoldBackgroundColor.withOpacity(0.0),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterOptionChip({
    required String label,
    required IconData icon,
    required bool selected,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: selected
              ? theme.colorScheme.primary
              : theme.colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: selected
                ? theme.colorScheme.primary
                : theme.colorScheme.outlineVariant,
            width: 1.2,
          ),
          boxShadow: selected
              ? [
                  BoxShadow(
                    color: theme.colorScheme.primary.withOpacity(0.15),
                    blurRadius: 8,
                    offset: const Offset(0, 4),
                  )
                ]
              : [],
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              icon,
              size: 16,
              color: selected
                  ? Colors.white
                  : theme.colorScheme.onSurfaceVariant,
            ),
            const SizedBox(width: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: selected ? FontWeight.w900 : FontWeight.w700,
                color: selected
                    ? Colors.white
                    : theme.colorScheme.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
