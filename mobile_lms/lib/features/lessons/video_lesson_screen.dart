import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class VideoLessonScreen extends StatefulWidget {
  final String courseId;
  const VideoLessonScreen({super.key, required this.courseId});

  @override
  State<VideoLessonScreen> createState() => _VideoLessonScreenState();
}

class _VideoLessonScreenState extends State<VideoLessonScreen> {
  int _selectedLesson = 0;
  bool _loading = true;
  List<dynamic> _lessons = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/lms/courses/${widget.courseId}/lessons');
      _lessons = res.data is List ? res.data as List : [];
    } catch (_) {
      _lessons = [];
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    final lesson = !_loading && _lessons.isNotEmpty && _selectedLesson < _lessons.length
        ? _lessons[_selectedLesson]
        : null;

    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Video Lessons', showBack: true),
      body: Column(
        children: [
          // ── Video player area ──────────────────────
          Container(
            width: double.infinity,
            height: 220,
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.2),
                  blurRadius: 12, offset: const Offset(0, 4)),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Gradient overlay
                Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [Color(0xFF2D1B3D), Color(0xFF1A1A2E)],
                    ),
                  ),
                ),
                // Play button
                Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      width: 64, height: 64,
                      decoration: BoxDecoration(
                        color: LMSTheme.maroon.withValues(alpha: 0.9),
                        shape: BoxShape.circle,
                        boxShadow: [
                          BoxShadow(
                            color: LMSTheme.maroon.withValues(alpha: 0.4),
                            blurRadius: 20, spreadRadius: 2),
                        ],
                      ),
                      child: const Icon(Icons.play_arrow_rounded,
                          color: Colors.white, size: 36),
                    ),
                    const SizedBox(height: 12),
                    Text((lesson?['title'] ?? 'Lesson').toString(),
                      style: const TextStyle(color: Colors.white,
                        fontSize: 14, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 4),
                    Text('Tap to play',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.6), fontSize: 12)),
                  ],
                ),
                // Progress bar at bottom
                Positioned(
                  bottom: 0, left: 0, right: 0,
                  child: LinearProgressIndicator(
                    value: 0.0,
                    backgroundColor: Colors.white.withValues(alpha: 0.1),
                    color: LMSTheme.goldStrong,
                    minHeight: 3,
                  ),
                ),
              ],
            ),
          ),

          // ── Lesson info ────────────────────────────
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text((lesson?['title'] ?? 'Lesson').toString(),
                        style: const TextStyle(fontSize: 16,
                          fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                      const SizedBox(height: 4),
                      Text((lesson?['description'] ?? '').toString().isEmpty
                          ? 'No description'
                          : (lesson?['description'] ?? '').toString(),
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade500)),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const Divider(height: 1),

          // ── Lesson list ────────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
                : _lessons.isEmpty
                    ? ListView(
                        children: const [
                          LMSEmptyState(
                            icon: Icons.play_circle_outline_rounded,
                            title: 'No lessons yet',
                            subtitle: 'Your instructor has not uploaded lessons yet.',
                          ),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _lessons.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (_, i) {
                          final l = _lessons[i];
                          final selected = i == _selectedLesson;
                          final title = (l['title'] ?? 'Lesson').toString();
                          final published = l['is_published'] == 1 || l['is_published'] == true;
                          return LMSCard(
                            onTap: () => setState(() => _selectedLesson = i),
                            color: selected ? LMSTheme.maroon.withValues(alpha: 0.06) : null,
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            child: Row(
                              children: [
                                Container(
                                  width: 36, height: 36,
                                  decoration: BoxDecoration(
                                    color: selected
                                        ? LMSTheme.maroon.withValues(alpha: 0.12)
                                        : LMSTheme.lmsBlue.withValues(alpha: 0.08),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Center(
                                    child: selected
                                        ? const Icon(Icons.play_arrow_rounded,
                                            color: LMSTheme.maroon, size: 20)
                                        : Text('${i + 1}',
                                            style: TextStyle(
                                              fontWeight: FontWeight.w800, fontSize: 13,
                                              color: selected ? LMSTheme.maroon : LMSTheme.lmsBlue)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(title,
                                        style: TextStyle(fontSize: 12,
                                          fontWeight: selected ? FontWeight.w800 : FontWeight.w600,
                                          color: LMSTheme.ink),
                                        maxLines: 1, overflow: TextOverflow.ellipsis),
                                      Text(published ? 'Available' : 'Locked',
                                        style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
