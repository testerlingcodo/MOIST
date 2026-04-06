import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class ModuleViewerScreen extends StatefulWidget {
  final String courseId;
  const ModuleViewerScreen({super.key, required this.courseId});

  @override
  State<ModuleViewerScreen> createState() => _ModuleViewerScreenState();
}

class _ModuleViewerScreenState extends State<ModuleViewerScreen> {
  bool _loading = true;
  List<dynamic> _modules = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    if (!mounted) return;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/lms/subjects/${widget.courseId}/lessons');
      final lessons = res.data is List ? res.data as List : <dynamic>[];
      _modules = lessons.where((l) {
        final t = (l['module_type'] ?? '').toString();
        final u = (l['module_url'] ?? '').toString();
        return t.isNotEmpty && u.isNotEmpty;
      }).toList();
    } catch (_) {
      _modules = [];
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Modules & Materials', showBack: true),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
            : _modules.isEmpty
                ? ListView(
                    children: const [
                      LMSEmptyState(
                        icon: Icons.picture_as_pdf_outlined,
                        title: 'No modules yet',
                        subtitle: 'PDFs and slides will appear here when uploaded.',
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: _modules.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (_, i) {
                      final m = _modules[i];
                      final title = (m['title'] ?? 'Module').toString();
                      final type = (m['module_type'] ?? 'PDF').toString().toUpperCase();
                      final url = (m['module_url'] ?? '').toString();
                      final color = type.contains('PDF') ? LMSTheme.danger : LMSTheme.lmsPurple;
                      final icon = type.contains('PDF') ? Icons.picture_as_pdf_rounded : Icons.slideshow_rounded;
                      return LMSCard(
                        onTap: url.isEmpty
                            ? null
                            : () async {
                                final uri = Uri.tryParse(url);
                                if (uri != null && await canLaunchUrl(uri)) {
                                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                                }
                              },
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 52, height: 52,
                              decoration: BoxDecoration(
                                color: color.withValues(alpha: 0.10),
                                borderRadius: BorderRadius.circular(14),
                                border: Border.all(color: color.withValues(alpha: 0.18)),
                              ),
                              child: Icon(icon, color: color, size: 26),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(title,
                                    style: const TextStyle(fontSize: 13,
                                      fontWeight: FontWeight.w700, color: LMSTheme.ink),
                                    maxLines: 2, overflow: TextOverflow.ellipsis),
                                  const SizedBox(height: 4),
                                  Row(
                                    children: [
                                      StatusBadge(label: type, color: color),
                                      const SizedBox(width: 8),
                                      Text(url.isEmpty ? 'No file' : 'Tap to open',
                                        style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              width: 36, height: 36,
                              decoration: BoxDecoration(
                                color: LMSTheme.maroon.withValues(alpha: 0.08),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.open_in_new_rounded,
                                  color: LMSTheme.maroon, size: 18),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
