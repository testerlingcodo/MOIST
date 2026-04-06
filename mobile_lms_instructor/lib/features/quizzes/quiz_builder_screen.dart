import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class QuizBuilderScreen extends StatefulWidget {
  const QuizBuilderScreen({super.key});

  @override
  State<QuizBuilderScreen> createState() => _QuizBuilderScreenState();
}

class _QuizBuilderScreenState extends State<QuizBuilderScreen> {
  final _titleCtrl = TextEditingController();
  final _timeCtrl = TextEditingController(text: '30');
  final _passingCtrl = TextEditingController(text: '60');
  bool _loading = false;
  List<dynamic> _courses = [];
  String? _selectedCourseId;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCourses());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _timeCtrl.dispose();
    _passingCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadCourses() async {
    try {
      final res = await ApiClient().dio.get('/lms/courses');
      final data = res.data;
      if (data is List) {
        _courses = data;
        if (_courses.isNotEmpty) {
          _selectedCourseId = (_courses.first['id'] ?? '').toString();
        }
      }
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _saveQuiz() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty || (_selectedCourseId ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quiz title and target course are required.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().dio.post(
        '/lms/courses/$_selectedCourseId/quizzes',
        data: {
          'title': title,
          'time_limit_minutes': int.tryParse(_timeCtrl.text.trim()) ?? 30,
          'passing_score': int.tryParse(_passingCtrl.text.trim()) ?? 60,
          'attempts_allowed': 1,
          'is_published': true,
          'questions': [],
        },
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Quiz created successfully.')),
      );
      context.pop();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to save quiz: $e')),
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
        subtitle: 'Quiz Builder',
        showBack: true,
        actions: [
          TextButton(
            onPressed: _loading ? null : _saveQuiz,
            child: const Text('SAVE', style: TextStyle(color: LMSTheme.goldStrong, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionHeader(title: 'Quiz Configuration'),
          const SizedBox(height: 10),
          LMSCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextFormField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(
                    labelText: 'Quiz Title',
                    hintText: 'e.g. Midterm Review Quiz',
                  ),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  decoration: const InputDecoration(labelText: 'Target Course'),
                  value: _selectedCourseId,
                  items: _courses.map((c) {
                    final id = (c['id'] ?? '').toString();
                    final code = (c['code'] ?? '').toString();
                    final title = (c['title'] ?? c['name'] ?? 'Course').toString();
                    return DropdownMenuItem(value: id, child: Text('$code - $title'));
                  }).toList(),
                  onChanged: (v) => setState(() => _selectedCourseId = v),
                ),
                const SizedBox(height: 16),
                 Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _timeCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Time Limit (mins)',
                          hintText: 'e.g. 30',
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _passingCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Passing Score',
                          hintText: 'e.g. 15',
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 24),
          const SectionHeader(title: 'Questions'),
          const SizedBox(height: 10),

          LMSCard(
            padding: const EdgeInsets.all(16),
            child: Center(
              child: Column(
                children: [
                  const Icon(Icons.library_add_rounded, size: 48, color: Colors.grey),
                  const SizedBox(height: 8),
                  Text('No questions added yet.', style: TextStyle(color: Colors.grey.shade600)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _loading ? null : _saveQuiz,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: Text(_loading ? 'Saving...' : 'Save Quiz'),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
