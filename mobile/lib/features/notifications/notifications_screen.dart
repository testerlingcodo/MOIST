import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../../shared/widgets/moist_brand.dart';
import 'student_notification_center.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() { _loading = true; _error = null; });
    try {
      final center = context.read<StudentNotificationCenter>();
      await center.refresh(allowLocalAlert: false, swallowErrors: false);
      if (center.unreadCount > 0) {
        await center.markAllRead(swallowErrors: false);
      }

      if (!mounted) return;
    } catch (_) {
      if (!mounted) return;
      setState(() { _error = 'Could not load notifications.'; });
    } finally {
      if (mounted) {
        setState(() { _loading = false; });
      }
    }
  }

  Color _itemColor(Map<String, dynamic> item) {
    final source = item['_source']?.toString();
    if (source == 'student') {
      final type = item['type']?.toString();
      if (type == 'document') return AppTheme.success;
      if (type == 'grade') return const Color(0xFF2563EB);
      return AppTheme.primary;
    }

    final cat = item['category']?.toString();
    switch (cat) {
      case 'urgent':
        return AppTheme.danger;
      case 'exam':
        return AppTheme.warning;
      case 'event':
        return AppTheme.success;
      default:
        return AppTheme.primary;
    }
  }

  IconData _itemIcon(Map<String, dynamic> item) {
    final source = item['_source']?.toString();
    if (source == 'student') {
      if (item['type']?.toString() == 'document') {
        return Icons.check_circle_rounded;
      }
      if (item['type']?.toString() == 'grade') {
        return Icons.grade_rounded;
      }
      return Icons.notifications_active_rounded;
    }

    final cat = item['category']?.toString();
    switch (cat) {
      case 'urgent':
        return Icons.priority_high_rounded;
      case 'exam':
        return Icons.edit_note_rounded;
      case 'event':
        return Icons.event_rounded;
      default:
        return Icons.campaign_rounded;
    }
  }

  String _itemTag(Map<String, dynamic> item) {
    final source = item['_source']?.toString();
    if (source == 'student') {
      return item['type']?.toString().toUpperCase() ?? 'NOTICE';
    }
    return item['category']?.toString().toUpperCase() ?? 'GENERAL';
  }

  @override
  Widget build(BuildContext context) {
    final items = context.watch<StudentNotificationCenter>().items;

    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: AppTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        scrolledUnderElevation: 0,
        titleSpacing: 0,
        title: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const MoistSealBadge(size: 32),
              const SizedBox(width: 10),
              Flexible(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'MOIST, INC.',
                      style: TextStyle(
                        color: AppTheme.goldStrong,
                        fontSize: 10,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 1.2,
                        height: 1.1,
                      ),
                    ),
                    Text(
                      'Notifications',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.9),
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        height: 1.1,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
                : _error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.wifi_off_rounded, size: 48, color: Colors.grey.shade300),
                        const SizedBox(height: 12),
                        Text(_error!, style: TextStyle(color: Colors.grey.shade500)),
                        const SizedBox(height: 16),
                        OutlinedButton(onPressed: _load, child: const Text('Retry')),
                      ],
                    ),
                  )
                : items.isEmpty
                    ? ListView(
                        children: [
                          SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                          Column(children: [
                            Icon(Icons.notifications_none_rounded, size: 64, color: Colors.grey.shade300),
                            const SizedBox(height: 12),
                            Text('No notifications yet',
                                style: TextStyle(color: Colors.grey.shade500, fontSize: 15)),
                            const SizedBox(height: 6),
                            Text('Check back later for updates.',
                                style: TextStyle(color: Colors.grey.shade400, fontSize: 12)),
                          ]),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: items.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final item = items[index];
                          final source = item['_source']?.toString() ?? 'announcement';
                          final color = _itemColor(item);
                          final createdAt = item['created_at'] != null
                              ? DateTime.tryParse(item['created_at'].toString())
                              : null;
                          final title = item['title']?.toString() ?? '';
                          final body = item['body']?.toString() ??
                              item['content']?.toString() ??
                              item['message']?.toString() ??
                              '';
                          final cardBg = source == 'student'
                              ? color.withValues(alpha: 0.08)
                              : AppTheme.cardBg;
                          final borderColor = source == 'student'
                              ? color.withValues(alpha: 0.2)
                              : AppTheme.maroon.withValues(alpha: 0.06);

                          return Material(
                            color: Colors.transparent,
                            child: InkWell(
                              borderRadius: BorderRadius.circular(18),
                              onTap: source == 'student' &&
                                      item['type']?.toString() == 'document'
                                  ? () => context.go('/documents')
                                  : null,
                              child: Container(
                                decoration: BoxDecoration(
                                  color: cardBg,
                                  borderRadius: BorderRadius.circular(18),
                                  border: Border.all(color: borderColor),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppTheme.maroon.withValues(alpha: 0.05),
                                      blurRadius: 12,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        width: 40,
                                        height: 40,
                                        decoration: BoxDecoration(
                                          color: color.withValues(alpha: 0.12),
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        child: Icon(_itemIcon(item), color: color, size: 20),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Row(
                                              children: [
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                  decoration: BoxDecoration(
                                                    color: color.withValues(alpha: 0.1),
                                                    borderRadius: BorderRadius.circular(20),
                                                  ),
                                                  child: Text(
                                                    _itemTag(item),
                                                    style: TextStyle(
                                                      fontSize: 9,
                                                      fontWeight: FontWeight.w700,
                                                      color: color,
                                                      letterSpacing: 0.5,
                                                    ),
                                                  ),
                                                ),
                                                if (createdAt != null) ...[
                                                  const SizedBox(width: 8),
                                                  Text(
                                                    '${createdAt.day}/${createdAt.month}/${createdAt.year}',
                                                    style: TextStyle(fontSize: 10, color: Colors.grey.shade400),
                                                  ),
                                                ],
                                              ],
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              title,
                                              style: const TextStyle(
                                                fontSize: 14,
                                                fontWeight: FontWeight.w700,
                                                color: AppTheme.ink,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              body,
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey.shade600,
                                                height: 1.4,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
