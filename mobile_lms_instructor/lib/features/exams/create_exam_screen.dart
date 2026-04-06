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
