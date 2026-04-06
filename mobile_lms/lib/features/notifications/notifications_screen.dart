import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  String? _error;
  List<dynamic> _announcements = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ApiClient().dio.get('/announcements');
      final data = res.data;
      _announcements = data is List ? data : [];
    } catch (_) {
      _error = 'Failed to load notifications.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Notifications', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _error != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(16),
                        child: LMSCard(
                          child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)),
                        ),
                      ),
                    ],
                  )
                : _announcements.isEmpty
                    ? ListView(
                        children: const [
                          LMSEmptyState(
                            icon: Icons.notifications_none_rounded,
                            title: 'No notifications yet',
                            subtitle: 'Announcements and updates will appear here.',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _announcements.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final a = _announcements[i];
                          final title = (a['title'] ?? 'Announcement').toString();
                          final body = (a['content'] ?? a['body'] ?? '').toString();
                          final createdAt = (a['created_at'] ?? '').toString();
                          return LMSCard(
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(title,
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                      color: LMSTheme.ink,
                                    )),
                                if (body.isNotEmpty) ...[
                                  const SizedBox(height: 6),
                                  Text(body, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                                ],
                                if (createdAt.isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(createdAt, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                                ],
                              ],
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}

