import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';

class StudentNotificationCenter extends ChangeNotifier with WidgetsBindingObserver {
  static const Duration _pollInterval = Duration(seconds: 20);
  static const AndroidNotificationChannel _channel = AndroidNotificationChannel(
    'student_updates',
    'Student Updates',
    description: 'Notifications for grades, announcements, and student updates.',
    importance: Importance.max,
  );

  final ApiClient _api = ApiClient();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  Timer? _pollTimer;
  String? _studentId;
  bool _initialized = false;
  bool _syncing = false;

  int _unreadCount = 0;
  List<Map<String, dynamic>> _items = const [];
  Map<String, dynamic>? _latestUnread;

  int get unreadCount => _unreadCount;
  bool get hasUnread => _unreadCount > 0;
  List<Map<String, dynamic>> get items => List.unmodifiable(_items);
  Map<String, dynamic>? get latestUnread => _latestUnread;

  void bindAuth(AuthService auth) {
    final nextStudentId =
        auth.isLoggedIn && auth.isStudent ? auth.studentId : null;
    if (_studentId == nextStudentId) return;

    _studentId = nextStudentId;
    if (_studentId == null) {
      _pollTimer?.cancel();
      _pollTimer = null;
      _items = const [];
      _latestUnread = null;
      _unreadCount = 0;
      notifyListeners();
      return;
    }

    unawaited(_ensureInitialized());
    _startPolling();
    unawaited(refresh(allowLocalAlert: false));
  }

  Future<void> refresh({
    bool allowLocalAlert = true,
    bool swallowErrors = true,
  }) async {
    final studentId = _studentId;
    if (studentId == null || _syncing) return;

    _syncing = true;
    try {
      await _ensureInitialized();

      final responses = await Future.wait([
        _api.dio.get('/student-notifications'),
        _api.dio.get(
          '/announcements',
          queryParameters: const {'limit': 50},
        ),
      ]);

      final studentNotifications = List<dynamic>.from(
        responses[0].data as List? ?? const [],
      ).map((raw) {
        final item = Map<String, dynamic>.from(raw as Map);
        item['_source'] = 'student';
        return item;
      }).toList();

      final announcements = List<dynamic>.from(
        (responses[1].data as Map?)?['data'] as List? ?? const [],
      ).map((raw) {
        final item = Map<String, dynamic>.from(raw as Map);
        item['_source'] = 'announcement';
        return item;
      }).toList();

      final storedKeys = await Future.wait<String?>([
        _storage.read(key: _studentKnownStorageKey(studentId)),
        _storage.read(key: _announcementKnownStorageKey(studentId)),
        _storage.read(key: _announcementSeenStorageKey(studentId)),
        _storage.read(key: _bootstrapStorageKey(studentId)),
      ]);

      var studentKnownKey = storedKeys[0];
      var announcementKnownKey = storedKeys[1];
      var announcementSeenKey = storedKeys[2];
      final isBootstrapped = storedKeys[3] == '1';

      final newStudentItems = allowLocalAlert && isBootstrapped
          ? _collectNewItemsUntilKey(
              studentNotifications,
              studentKnownKey,
              _studentItemKey,
            )
          : const <Map<String, dynamic>>[];

      final newAnnouncementItems = allowLocalAlert && isBootstrapped
          ? _collectNewItemsUntilKey(
              announcements,
              announcementKnownKey,
              _announcementItemKey,
            )
          : const <Map<String, dynamic>>[];

      final latestStudentKey = _studentItemKeyFromList(studentNotifications);
      final latestAnnouncementKey =
          _announcementItemKeyFromList(announcements);

      final writes = <Future<void>>[];
      if (!isBootstrapped) {
        if (latestStudentKey != null) {
          studentKnownKey = latestStudentKey;
          writes.add(
            _storage.write(
              key: _studentKnownStorageKey(studentId),
              value: latestStudentKey,
            ),
          );
        }
        if (latestAnnouncementKey != null) {
          announcementKnownKey = latestAnnouncementKey;
          announcementSeenKey = latestAnnouncementKey;
          writes.addAll([
            _storage.write(
              key: _announcementKnownStorageKey(studentId),
              value: latestAnnouncementKey,
            ),
            _storage.write(
              key: _announcementSeenStorageKey(studentId),
              value: latestAnnouncementKey,
            ),
          ]);
        }
        writes.add(
          _storage.write(
            key: _bootstrapStorageKey(studentId),
            value: '1',
          ),
        );
      } else {
        if (latestStudentKey != null && latestStudentKey != studentKnownKey) {
          writes.add(
            _storage.write(
              key: _studentKnownStorageKey(studentId),
              value: latestStudentKey,
            ),
          );
        }

        if (latestAnnouncementKey != null &&
            latestAnnouncementKey != announcementKnownKey) {
          writes.add(
            _storage.write(
              key: _announcementKnownStorageKey(studentId),
              value: latestAnnouncementKey,
            ),
          );
        }
      }

      final alertItems = <Map<String, dynamic>>[
        ...newStudentItems,
        ...newAnnouncementItems,
      ]..sort((a, b) => _createdAt(a).compareTo(_createdAt(b)));
      for (final item in alertItems) {
        await _showLocalNotification(item);
      }

      if (writes.isNotEmpty) {
        await Future.wait(writes);
      }

      final announcementUnreadCount = _countAnnouncementsUntilSeen(
        announcements,
        announcementSeenKey,
        assumeAllUnreadIfNoSeenKey: isBootstrapped,
      );
      final latestUnreadStudent = _firstUnreadStudent(studentNotifications);
      final latestUnreadAnnouncement = _firstUnreadAnnouncement(
        announcements,
        announcementSeenKey,
        assumeAllUnreadIfNoSeenKey: isBootstrapped,
      );

      _items = <Map<String, dynamic>>[
        ...studentNotifications,
        ...announcements,
      ]..sort((a, b) => _createdAt(b).compareTo(_createdAt(a)));
      _unreadCount =
          studentNotifications.where(_isStudentUnread).length +
          announcementUnreadCount;
      _latestUnread = _pickLatest(
        latestUnreadStudent,
        latestUnreadAnnouncement,
      );
      notifyListeners();
    } catch (error, stackTrace) {
      debugPrint('StudentNotificationCenter.refresh failed: $error');
      debugPrintStack(stackTrace: stackTrace);
      if (!swallowErrors) rethrow;
    } finally {
      _syncing = false;
    }
  }

  Future<void> markAllRead({bool swallowErrors = true}) async {
    final studentId = _studentId;
    if (studentId == null) return;

    try {
      await _api.dio.patch('/student-notifications/mark-all-read');

      final latestStudentKey = _studentItemKeyFromList(
        _items.where((item) => item['_source'] == 'student').toList(),
      );
      final latestAnnouncementKey = _announcementItemKeyFromList(
        _items.where((item) => item['_source'] == 'announcement').toList(),
      );

      final writes = <Future<void>>[];
      if (latestStudentKey != null) {
        writes.add(
          _storage.write(
            key: _studentKnownStorageKey(studentId),
            value: latestStudentKey,
          ),
        );
      }
      if (latestAnnouncementKey != null) {
        writes.addAll([
          _storage.write(
            key: _announcementKnownStorageKey(studentId),
            value: latestAnnouncementKey,
          ),
          _storage.write(
            key: _announcementSeenStorageKey(studentId),
            value: latestAnnouncementKey,
          ),
        ]);
      }
      if (writes.isNotEmpty) {
        await Future.wait(writes);
      }

      await refresh(allowLocalAlert: false, swallowErrors: false);
    } catch (error) {
      if (!swallowErrors) rethrow;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _studentId != null) {
      unawaited(refresh());
    }
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    if (_initialized) {
      WidgetsBinding.instance.removeObserver(this);
    }
    super.dispose();
  }

  void _startPolling() {
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(_pollInterval, (_) {
      unawaited(refresh());
    });
  }

  Future<void> _ensureInitialized() async {
    if (_initialized) return;

    WidgetsBinding.instance.addObserver(this);

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: false,
      requestBadgePermission: false,
      requestSoundPermission: false,
    );

    await _localNotifications.initialize(
      const InitializationSettings(
        android: androidSettings,
        iOS: iosSettings,
      ),
    );

    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    await androidPlugin?.createNotificationChannel(_channel);
    await androidPlugin?.requestNotificationsPermission();

    final iosPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    await iosPlugin?.requestPermissions(
      alert: true,
      badge: true,
      sound: true,
    );

    _initialized = true;
  }

  Future<void> _showLocalNotification(Map<String, dynamic> item) async {
    final title = item['title']?.toString().trim();
    final body = (item['body'] ?? item['content'] ?? item['message'])
        ?.toString()
        .trim();
    if (title == null || title.isEmpty || body == null || body.isEmpty) return;

    final androidDetails = AndroidNotificationDetails(
      _channel.id,
      _channel.name,
      channelDescription: _channel.description,
      importance: Importance.max,
      priority: Priority.high,
    );
    const iosDetails = DarwinNotificationDetails();

    await _localNotifications.show(
      item['id']?.toString().hashCode.abs() ?? DateTime.now().millisecondsSinceEpoch,
      title,
      body,
      NotificationDetails(android: androidDetails, iOS: iosDetails),
    );
  }

  String _studentKnownStorageKey(String studentId) =>
      'student_notification_known_$studentId';

  String _announcementKnownStorageKey(String studentId) =>
      'announcement_known_$studentId';

  String _announcementSeenStorageKey(String studentId) =>
      'announcement_seen_$studentId';

  String _bootstrapStorageKey(String studentId) =>
      'notification_bootstrapped_$studentId';

  String? _studentItemKey(Map<String, dynamic> item) => item['id']?.toString();

  String? _announcementItemKey(Map<String, dynamic> item) {
    final id = item['id']?.toString() ?? '';
    final createdAt = item['created_at']?.toString() ?? '';
    if (id.isEmpty && createdAt.isEmpty) return null;
    return '$id|$createdAt';
  }

  String? _studentItemKeyFromList(List<Map<String, dynamic>> items) =>
      items.isEmpty ? null : _studentItemKey(items.first);

  String? _announcementItemKeyFromList(List<Map<String, dynamic>> items) =>
      items.isEmpty ? null : _announcementItemKey(items.first);

  DateTime _createdAt(Map<String, dynamic> item) {
    final parsed = DateTime.tryParse(item['created_at']?.toString() ?? '');
    return parsed?.toLocal() ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  bool _isStudentUnread(Map<String, dynamic> item) {
    final value = item['is_read'];
    return value == 0 || value == false || value?.toString() == '0';
  }

  List<Map<String, dynamic>> _collectNewItemsUntilKey(
    List<Map<String, dynamic>> items,
    String? knownKey,
    String? Function(Map<String, dynamic>) keyBuilder,
  ) {
    if (knownKey == null || knownKey.isEmpty) {
      return List<Map<String, dynamic>>.from(items);
    }

    final fresh = <Map<String, dynamic>>[];
    for (final item in items) {
      if (keyBuilder(item) == knownKey) break;
      fresh.add(item);
    }
    return fresh;
  }

  int _countAnnouncementsUntilSeen(
    List<Map<String, dynamic>> announcements,
    String? seenKey, {
    required bool assumeAllUnreadIfNoSeenKey,
  }
  ) {
    if (seenKey == null || seenKey.isEmpty) {
      return assumeAllUnreadIfNoSeenKey ? announcements.length : 0;
    }

    var count = 0;
    for (final item in announcements) {
      if (_announcementItemKey(item) == seenKey) break;
      count += 1;
    }
    return count;
  }

  Map<String, dynamic>? _firstUnreadStudent(
    List<Map<String, dynamic>> studentNotifications,
  ) {
    for (final item in studentNotifications) {
      if (_isStudentUnread(item)) return item;
    }
    return null;
  }

  Map<String, dynamic>? _firstUnreadAnnouncement(
    List<Map<String, dynamic>> announcements,
    String? seenKey, {
    required bool assumeAllUnreadIfNoSeenKey,
  }
  ) {
    if (announcements.isEmpty) return null;
    if (seenKey == null || seenKey.isEmpty) {
      return assumeAllUnreadIfNoSeenKey ? announcements.first : null;
    }
    for (final item in announcements) {
      if (_announcementItemKey(item) == seenKey) return null;
      return item;
    }
    return null;
  }

  Map<String, dynamic>? _pickLatest(
    Map<String, dynamic>? a,
    Map<String, dynamic>? b,
  ) {
    if (a == null) return b;
    if (b == null) return a;
    return _createdAt(a).isAfter(_createdAt(b)) ? a : b;
  }
}
