import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class CreateExamScreen extends StatefulWidget {
  const CreateExamScreen({super.key});

  @override
  State<CreateExamScreen> createState() => _CreateExamScreenState();
}

class _CreateExamScreenState extends State<CreateExamScreen> {
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _durationCtrl = TextEditingController(text: '60');
  final _attemptCtrl = TextEditingController(text: '1');
  final _passingCtrl = TextEditingController(text: '60');
  
  bool _loading = false;
  List<dynamic> _courses = [];
  String? _selectedCourseId;
  String? _courseHint;
  bool _randomizeQuestions = true;
  bool _randomizeChoices = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadCourses());
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    _durationCtrl.dispose();
    _attemptCtrl.dispose();
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

          // If LMS course code encodes year level (e.g. BSIT-1, BSIT Y1), filter by course+year.
          final extractedYear = _extractYearFromCode(codeRaw);
          if (extractedYear != null) {
            final baseCourse = _extractBaseCourseFromCode(codeRaw).toUpperCase();
            return allowedPairs.contains('$baseCourse-$extractedYear');
          }
          // Otherwise fall back to course-only matching.
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

  Future<void> _createExam() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty || (_selectedCourseId ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Title and target course are required.')),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.post(
        '/lms/courses/$_selectedCourseId/exams',
        data: {
          'title': title,
          'description': _descCtrl.text.trim(),
          'duration_minutes': int.tryParse(_durationCtrl.text.trim()) ?? 60,
          'attempts_allowed': int.tryParse(_attemptCtrl.text.trim()) ?? 1,
          'passing_score': int.tryParse(_passingCtrl.text.trim()) ?? 60,
          'shuffle_questions': _randomizeQuestions,
          'shuffle_choices': _randomizeChoices,
          'timer_enabled': true,
          'is_published': true,
          'questions': [],
        },
      );
      final examId = (res.data['id'] ?? '').toString();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Exam created successfully.')),
      );
      if (examId.isNotEmpty) {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/dashboard');
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create exam: $e')),
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
        subtitle: 'Create Exam',
        showBack: true,
        actions: [
          TextButton(
            onPressed: _loading ? null : _createExam,
            child: const Text('SAVE', style: TextStyle(color: LMSTheme.goldStrong, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const SectionHeader(title: 'Exam Details'),
          const SizedBox(height: 10),
          LMSCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextFormField(
                  controller: _titleCtrl,
                  decoration: const InputDecoration(labelText: 'Exam Title', hintText: 'Final Examination'),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _descCtrl,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: 'Description (Optional)', hintText: 'Chapters 1-5 coverage.', alignLabelWithHint: true),
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
              ],
            ),
          ),

          const SizedBox(height: 24),
          const SectionHeader(title: 'Exam Settings'),
          const SizedBox(height: 10),

          LMSCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                 Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _durationCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Duration (mins)', hintText: '60'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _attemptCtrl,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(labelText: 'Attempts Allowed', hintText: '1'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passingCtrl,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(labelText: 'Passing Score', hintText: '60'),
                ),
                const SizedBox(height: 16),
                SwitchListTile(
                  title: const Text('Randomize Question Order', style: TextStyle(fontSize: 14)),
                  value: _randomizeQuestions,
                  activeColor: LMSTheme.maroon,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setState(() => _randomizeQuestions = v),
                ),
                SwitchListTile(
                  title: const Text('Randomize Multiple Choices', style: TextStyle(fontSize: 14)),
                  value: _randomizeChoices,
                  activeColor: LMSTheme.maroon,
                  contentPadding: EdgeInsets.zero,
                  onChanged: (v) => setState(() => _randomizeChoices = v),
                ),
              ],
            ),
          ),
          
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _loading ? null : _createExam,
              icon: const Icon(Icons.arrow_forward_rounded, size: 18),
              label: Text(_loading ? 'Creating...' : 'Create Exam'),
            )
          )
        ],
      ),
    );
  }
}
