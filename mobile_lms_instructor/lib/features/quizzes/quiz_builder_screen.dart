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
  String? _courseHint;

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
      final api = ApiClient().dio;
      final results = await Future.wait([
        api.get('/lms/courses'),
        api.get('/teachers/me/students'),
      ]);
      final courseData = results[0].data;
      final studentData = results[1].data;

      final allCourses = courseData is List ? courseData : <dynamic>[];
      final students = studentData is List ? studentData : <dynamic>[];

      if (students.isEmpty) {
        _courses = [];
        _selectedCourseId = null;
        _courseHint = 'No handled students found (active term).';
      } else {
        final allowedPairs = <String>{};
        final allowedCourses = <String>{};
        for (final s in students) {
          final c = (s['course'] ?? '').toString().trim().toUpperCase();
          final y = (s['year_level'] ?? s['yearLevel']);
          final yl = y is num ? y.toInt() : int.tryParse(y?.toString() ?? '');
          if (c.isEmpty) continue;
          allowedCourses.add(c);
          if (yl != null) allowedPairs.add('$c-$yl');
        }

        bool courseAllowed(dynamic course) {
          final codeRaw = (course['code'] ?? '').toString().trim();
          final code = codeRaw.toUpperCase();
          if (code.isEmpty) return false;

          final extractedYear = _extractYearFromCode(codeRaw);
          if (extractedYear != null) {
            final baseCourse = _extractBaseCourseFromCode(codeRaw).toUpperCase();
            return allowedPairs.contains('$baseCourse-$extractedYear');
          }
          return allowedCourses.contains(code);
        }

        _courses = allCourses.where(courseAllowed).toList();
        _courseHint = _courses.isEmpty
            ? 'No target courses match your handled students (course/year).'
            : null;
        _selectedCourseId = _courses.isNotEmpty ? (_courses.first['id'] ?? '').toString() : null;
      }
      if (mounted) setState(() {});
    } catch (_) {}
  }

  int? _extractYearFromCode(String code) {
    final upper = code.toUpperCase();
    final m1 = RegExp(r'(?:^|[^A-Z0-9])Y\s*([1-6])(?:$|[^0-9])').firstMatch(upper);
    if (m1 != null) return int.tryParse(m1.group(1)!);
    final m2 = RegExp(r'(?:^|[^0-9])([1-6])(?:ST|ND|RD|TH)?\s*YEAR(?:$|[^A-Z])').firstMatch(upper);
    if (m2 != null) return int.tryParse(m2.group(1)!);
    final m3 = RegExp(r'[-_\s]([1-6])\b').firstMatch(upper);
    if (m3 != null) return int.tryParse(m3.group(1)!);
    return null;
  }

  String _extractBaseCourseFromCode(String code) {
    final upper = code.toUpperCase().trim();
    final stripped = upper
        .replaceAll(RegExp(r'\b(?:Y\s*[1-6]|[1-6](?:ST|ND|RD|TH)?\s*YEAR)\b'), '')
        .replaceAll(RegExp(r'[-_\s][1-6]\b'), '')
        .trim();
    return stripped.isEmpty ? upper : stripped;
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
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/dashboard');
      }
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
                  hint: _courseHint != null ? Text(_courseHint!) : null,
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
