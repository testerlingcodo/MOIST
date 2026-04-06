import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class UploadModuleScreen extends StatefulWidget {
  const UploadModuleScreen({super.key});

  @override
  State<UploadModuleScreen> createState() => _UploadModuleScreenState();
}

class _UploadModuleScreenState extends State<UploadModuleScreen> {
  final _titleCtrl = TextEditingController();
  final _urlCtrl = TextEditingController();
  String _moduleType = 'pdf';

  bool _loading = false;
  List<dynamic> _subjects = [];
  String? _selectedSubjectId;
  String? _hint;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadSubjects());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _urlCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadSubjects() async {
    try {
      final res = await ApiClient().dio.get('/lms/subjects/my');
      final rows = res.data is List ? res.data as List : <dynamic>[];
      _subjects = rows;
      _selectedSubjectId = _subjects.isNotEmpty ? (_subjects.first['subject_id'] ?? '').toString() : null;
      _hint = _subjects.isEmpty ? 'No handled subjects found (active term).' : null;
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _save() async {
    final title = _titleCtrl.text.trim();
    final url = _urlCtrl.text.trim();
    if ((_selectedSubjectId ?? '').isEmpty || title.isEmpty || url.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Subject, title, and file link are required.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().dio.post(
        '/lms/subjects/$_selectedSubjectId/lessons',
        data: {
          'title': title,
          'content_type': 'module',
          'module_type': _moduleType,
          'module_url': url,
          'is_published': true,
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Module posted.')),
      );
      if (context.canPop()) {
        context.pop();
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to post module: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(
        context: context,
        subtitle: 'Upload Module Link',
        showBack: true,
        actions: [
          TextButton(
            onPressed: _loading ? null : _save,
            child: const Text('SAVE', style: TextStyle(color: LMSTheme.goldStrong, fontWeight: FontWeight.w800)),
          )
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          LMSCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Target Subject'),
                  value: _selectedSubjectId,
                  hint: _hint != null ? Text(_hint!) : null,
                  items: _subjects.map((s) {
                    final id = (s['subject_id'] ?? '').toString();
                    final code = (s['subject_code'] ?? '').toString();
                    final name = (s['subject_name'] ?? 'Subject').toString();
                    return DropdownMenuItem(value: id, child: Text('$code - $name'));
                  }).toList(),
                  onChanged: (v) => setState(() => _selectedSubjectId = v),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(labelText: 'Module Title'),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Module Type'),
                  value: _moduleType,
                  items: const [
                    DropdownMenuItem(value: 'pdf', child: Text('PDF')),
                    DropdownMenuItem(value: 'slides', child: Text('Slides')),
                    DropdownMenuItem(value: 'doc', child: Text('Document')),
                    DropdownMenuItem(value: 'link', child: Text('Link')),
                  ],
                  onChanged: (v) => setState(() => _moduleType = v ?? 'pdf'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _urlCtrl,
                  decoration: const InputDecoration(labelText: 'Module URL (Google Drive / direct link)'),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _loading ? null : _save,
                    icon: const Icon(Icons.upload_file_rounded, size: 18),
                    label: Text(_loading ? 'Posting...' : 'Post Module'),
                  ),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}

