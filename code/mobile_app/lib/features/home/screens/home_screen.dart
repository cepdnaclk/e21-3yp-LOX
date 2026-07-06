import 'dart:ui';
import 'package:flutter/material.dart';

import '../../../data/local/local_store.dart';
import '../../../data/models/access_request.dart';
import '../../../data/models/locker.dart';
import '../../../data/models/session_data.dart';
import '../../../data/models/station.dart';
import '../../../data/models/user_profile.dart';
import '../tabs/account/screens/account_screen.dart';
import '../tabs/my_lockers/screens/requests_screen.dart';
import '../tabs/explore/screens/station_detail_screen.dart';
import '../tabs/explore/screens/explore_screen.dart';
import '../widgets/side_menu_drawer.dart';
import 'settings_screen.dart';
import '../../../core/theme/theme_style.dart';

/// The primary shell screen for authenticated users.
///
/// Coordinates top-level data fetching (stations, lockers, requests) and
/// manages bottom navigation state using an [IndexedStack] to preserve
/// the UI state of individual tabs.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, required this.session, required this.onLogout});

  /// Contains the authenticated user profile and the API client.
  final SessionData session;

  final Future<void> Function() onLogout;

  @override
  State<HomeScreen> createState() => HomeScreenState();
}

class HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();

  // Navigation State
  int _tabIndex = 0;

  bool _initialLoading = true;
  bool _refreshing = false;
  String? _error;
  bool _savingLocation = false;

  String _locationDraft = '';
  String _savedLocation = '';
  String _selectedStationId = '';

  // Core Data State
  late UserProfile _user;
  List<Station> _stations = const [];
  List<AccessRequest> _requests = const [];

  /// Maps a Station ID to its corresponding list of Lockers.
  final Map<String, List<Locker>> _lockersByStation = {};

  Future<void> refreshData() async {
    await _loadData();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _user = widget.session.user;
    _loadUiPrefsAndData();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint('LoX App Resumed: auto-refreshing dashboard data...');
      _loadData();
    }
  }

  /// Initializes the screen by loading local user preferences first,
  /// then triggers the remote data fetch.
  Future<void> _loadUiPrefsAndData() async {
    final uiPrefs = await LocalStore.loadUiPrefs();

    _locationDraft = uiPrefs.savedLocation;
    _savedLocation = uiPrefs.savedLocation;
    _selectedStationId = uiPrefs.selectedStationId;

    await _loadData();
  }

  /// Fetches all required backend data to populate the home screen.
  Future<void> _loadData() async {
    final isInitial = _initialLoading;
    if (!isInitial) {
      setState(() => _refreshing = true);
    } else {
      setState(() => _error = null);
    }
    try {
      final stations = await widget.session.client.fetchStations();
      final requests = await widget.session.client.fetchRequests();

      _lockersByStation.clear();

      // Concurrently fetch lockers for all retrieved stations to reduce load time.
      final lockerEntries = await Future.wait(
        stations.map((station) async {
          try {
            final lockers = await widget.session.client.fetchLockers(
              station.id,
            );
            return MapEntry(station.id, lockers);
          } catch (_) {
            return MapEntry(station.id, <Locker>[]);
          }
        }),
      );
      _lockersByStation.addEntries(lockerEntries);

      // Validate and update the selected station ID.
      if (_selectedStationId.isNotEmpty &&
          !stations.any((s) => s.id == _selectedStationId)) {
        _selectedStationId = '';
      }
      if (_selectedStationId.isEmpty && stations.isNotEmpty) {
        _selectedStationId = stations.first.id;
      }
      await LocalStore.saveSelectedStation(_selectedStationId);

      if (!mounted) return;
      setState(() {
        _stations = stations;
        _requests = requests;
        _initialLoading = false;
        _refreshing = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        if (isInitial) _error = error.toString();
        _initialLoading = false;
        _refreshing = false;
      });
    }
  }

  /// Lightweight refresh: only re-fetches requests and the lockers for
  /// the station that the user is currently interacting with.
  Future<void> _refreshActiveLocker([String? stationId]) async {
    setState(() => _refreshing = true);
    try {
      final requests = await widget.session.client.fetchRequests();

      if (stationId != null && stationId.isNotEmpty) {
        try {
          final lockers = await widget.session.client.fetchLockers(stationId);
          _lockersByStation[stationId] = lockers;
        } catch (_) {}
      }

      if (!mounted) return;
      setState(() {
        _requests = requests;
        _refreshing = false;
      });
    } catch (_) {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  /// Persists the user's drafted location to local storage.
  Future<void> _saveLocation() async {
    setState(() => _savingLocation = true);
    final next = _locationDraft.trim();
    await LocalStore.saveLocation(next);
    if (!mounted) return;
    setState(() {
      _savedLocation = next;
      _savingLocation = false;
    });
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text('Location saved.')));
  }

  /// Checks if there is an active access request associated with a specific [stationId].
  ///
  /// PENDING and QUEUED are always considered active.
  /// APPROVED is only considered active if the user still has a currently booked locker
  /// at this station — because AccessRequest.status is never changed back from APPROVED
  /// when a locker is released, so old completed sessions remain as APPROVED in the DB.
  AccessRequest? _activeRequestForStation(String stationId) {
    final lockers = _lockersByStation[stationId] ?? [];

    for (final r in _requests) {
      if (r.stationId != stationId) continue;

      if (r.status == 'PENDING' || r.status == 'QUEUED') {
        return r;
      }

      if (r.status == 'APPROVED') {
        // Only treat as active if there is a locker currently booked to this user at this station
        final hasActiveLocker = lockers.any(
          (l) => l.isBooked && l.currentUserId == _user.id,
        );
        if (hasActiveLocker) return r;
      }
    }
    return null;
  }

  /// Calculates the number of unbooked lockers for a given [stationId].
  int _freeCountForStation(String stationId) {
    return (_lockersByStation[stationId] ?? const [])
        .where((l) => !l.isBooked)
        .length;
  }

  /// Navigates to the [StationDetailScreen] for the selected station.
  Future<void> _openStation(Station station) async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => StationDetailScreen(
          client: widget.session.client,
          station: station,
          initialLockers: _lockersByStation[station.id] ?? const [],
          activeRequest: _activeRequestForStation(station.id),
        ),
      ),
    );
    if (result == true) await _loadData();
  }

  @override
  Widget build(BuildContext context) {
    if (_initialLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Smart Locker')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center),
                const SizedBox(height: 12),
                FilledButton(onPressed: _loadData, child: const Text('Retry')),
              ],
            ),
          ),
        ),
      );
    }

    final mainDecoration = BoxDecoration(
      color: Theme.of(context).scaffoldBackgroundColor,
    );

    final themeStyle = Theme.of(context).extension<AppThemeStyle>() ?? AppThemeStyle(
      cardRadius: 20,
      buttonRadius: 16,
      fieldRadius: 14,
      navBarBg: Theme.of(context).colorScheme.surface.withOpacity(0.92),
      navBarBlur: 10,
      navBarActiveColor: Theme.of(context).colorScheme.primary,
    );

    return Scaffold(
      key: _scaffoldKey,
      extendBody: true, // Crucial: lets the body scroll view extend behind the bottom nav bar!
      endDrawer: SideMenuDrawer(
        user: _user,
        client: widget.session.client,
        onProfileUpdated: (updatedUser) {
          setState(() {
            _user = updatedUser;
          });
        },
        onLogout: widget.onLogout,
        onSettingsDismissed: () async {
          final uiPrefs = await LocalStore.loadUiPrefs();
          setState(() {
            _savedLocation = uiPrefs.savedLocation;
            _locationDraft = uiPrefs.savedLocation;
          });
        },
      ),
      body: Container(
        decoration: mainDecoration,
        child: IndexedStack(
          index: _tabIndex,
          children: [
            StationsView(
              stations: _stations,
              lockersByStation: _lockersByStation,
              locationDraft: _locationDraft,
              savedLocation: _savedLocation,
              savingLocation: _savingLocation,
              onLocationChanged: (val) => setState(() => _locationDraft = val),
              onSaveLocation: _saveLocation,
              activeRequestForStation: _activeRequestForStation,
              freeCountForStation: _freeCountForStation,
              onOpenStation: _openStation,
              onRefresh: _loadData,
              onGoToProfile: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AccountScreen(
                      user: _user,
                      client: widget.session.client,
                      onProfileUpdated: (updatedUser) {
                        setState(() {
                          _user = updatedUser;
                        });
                      },
                      onLogout: widget.onLogout,
                    ),
                  ),
                );
              },
            ),
            RequestsScreen(
              requests: _requests,
              stations: _stations,
              client: widget.session.client,
              user: _user,
              lockersByStation: _lockersByStation,
              onRefresh: _loadData,
              onLockerAction: _refreshActiveLocker,
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        height: 120,
        color: Colors.transparent,
        child: Stack(
          clipBehavior: Clip.none,
          alignment: Alignment.bottomCenter,
          children: [
            Positioned(
              left: 24,
              right: 24,
              bottom: 24,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(40),
                  boxShadow: themeStyle.cardShadow ?? [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(40),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: themeStyle.navBarBlur, sigmaY: themeStyle.navBarBlur),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: themeStyle.navBarBg,
                        borderRadius: BorderRadius.circular(40),
                        border: themeStyle.navBarBorder ?? Border.all(
                          color: Theme.of(context).colorScheme.outlineVariant.withOpacity(0.3),
                          width: 1,
                        ),
                      ),
                      child: SafeArea(
                        top: false,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          children: [
                            _buildNavItem(1, Icons.bookmark_outline, Icons.bookmark, 'BOOKINGS', themeStyle),
                            const SizedBox(width: 96), // Spacer matching the larger floating explore button width
                            _buildNavItem(2, Icons.menu, Icons.menu, 'MENU', themeStyle),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 11, // Perfectly aligns the larger EXPLORE text baseline with BOOKINGS and MENU labels
              child: _buildExploreNavItem(0, Icons.explore_outlined, Icons.explore, 'EXPLORE', themeStyle),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExploreNavItem(int index, IconData outlineIcon, IconData solidIcon, String label, AppThemeStyle themeStyle) {
    final isSelected = _tabIndex == index;
    final theme = Theme.of(context);
    
    final bgColor = themeStyle.navBarBg;
        
    final iconColor = isSelected
        ? themeStyle.navBarActiveColor 
        : theme.colorScheme.onSurface.withOpacity(0.4);

    final textColor = isSelected 
        ? themeStyle.navBarActiveColor 
        : theme.colorScheme.onSurface.withOpacity(0.4);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        setState(() => _tabIndex = index);
      },
      child: Container(
        width: 96,
        height: 96,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: bgColor,
          border: Border.all(
            color: isSelected 
                ? themeStyle.navBarActiveColor 
                : themeStyle.navBarActiveColor.withOpacity(0.4),
            width: 2.5,
          ),
          boxShadow: themeStyle.cardShadow ?? [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 16,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(48),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: themeStyle.navBarBlur, sigmaY: themeStyle.navBarBlur),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    isSelected ? solidIcon : outlineIcon,
                    color: iconColor,
                    size: 36, // Noticeably larger icon
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    style: TextStyle(
                      color: textColor,
                      fontSize: 11, // Larger label text
                      fontWeight: FontWeight.w900, // Bolder
                      letterSpacing: 0.9,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData outlineIcon, IconData solidIcon, String label, AppThemeStyle themeStyle) {
    final isSelected = _tabIndex == index;
    final theme = Theme.of(context);
    final color = isSelected 
        ? themeStyle.navBarActiveColor 
        : theme.colorScheme.onSurface.withOpacity(0.4);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        if (index == 2) {
          _scaffoldKey.currentState?.openEndDrawer();
        } else {
          setState(() => _tabIndex = index);
        }
      },
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isSelected ? solidIcon : outlineIcon,
            color: color,
            size: 24,
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.8,
            ),
          ),
        ],
      ),
    );
  }
}
