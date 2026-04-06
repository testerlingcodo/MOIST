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
  List<dynamic> _subjects = [];
  String? _selectedSubjectId;
  String? _subjectHint;
  final List<_QuestionDraft> _questions = [];

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

  void _addQuestion() {
    setState(() => _questions.add(_QuestionDraft()));
  }

  void _removeQuestion(int index) {
    setState(() => _questions.removeAt(index));
  }

  Future<void> _loadCourses() async {
    try {
      final res = await ApiClient().dio.get('/lms/subjects/my');
      final data = res.data;
      final rows = data is List ? data : <dynamic>[];
      _subjects = rows;
      _selectedSubjectId = _subjects.isNotEmpty
          ? (_subjects.first['subject_id'] ?? '').toString()
          : null;
      _subjectHint = _subjects.isEmpty
          ? 'No handled subjects found (active term).'
          : null;
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _saveQuiz() async {
    final title = _titleCtrl.text.trim();
    if (title.isEmpty || (_selectedSubjectId ?? '').isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Quiz title and target subject are required.'),
        ),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiClient().dio.post(
        '/lms/subjects/$_selectedSubjectId/quizzes',
        data: {
          'title': title,
          'time_limit_minutes': int.tryParse(_timeCtrl.text.trim()) ?? 30,
          'passing_score': int.tryParse(_passingCtrl.text.trim()) ?? 60,
          'attempts_allowed': 1,
          'is_published': true,
          'questions': _questions
              .asMap()
              .entries
              .map((entry) {
                final i = entry.key;
                final q = entry.value;
                return {
                  'question_type': q.type,
                  'question_text': q.questionCtrl.text.trim(),
                  'choices': q.type == 'multiple_choice'
                      ? q.choiceCtrls
                            .map((c) => c.text.trim())
                            .where((x) => x.isNotEmpty)
                            .toList()
                      : null,
                  'correct_answer': q.type == 'essay'
                      ? null
                      : q.correctCtrl.text.trim(),
                  'points': int.tryParse(q.pointsCtrl.text.trim()) ?? 1,
                  'position': i + 1,
                };
              })
              .where((q) => (q['question_text'] as String).isNotEmpty)
              .toList(),
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
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to save quiz: $e')));
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
            child: const Text(
              'SAVE',
              style: TextStyle(
                color: LMSTheme.goldStrong,
                fontWeight: FontWeight.w800,
              ),
            ),
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
                  decoration: const InputDecoration(
                    labelText: 'Target Subject',
                  ),
                  value: _selectedSubjectId,
                  hint: _subjectHint != null ? Text(_subjectHint!) : null,
                  items: _subjects.map((s) {
                    final id = (s['subject_id'] ?? '').toString();
                    final code = (s['subject_code'] ?? '').toString();
                    final name = (s['subject_name'] ?? 'Subject').toString();
                    return DropdownMenuItem(
                      value: id,
                      child: Text('$code - $name'),
                    );
                  }).toList(),
                  onChanged: (v) => setState(() => _selectedSubjectId = v),
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
            child: Column(
              children: [
                if (_questions.isEmpty)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: Text(
                      'No questions added yet.',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                  ),
                ..._questions.asMap().entries.map((entry) {
                  final i = entry.key;
                  final q = entry.value;
                  return _QuestionCard(
                    index: i,
                    draft: q,
                    onDelete: () => _removeQuestion(i),
                    onChanged: () => setState(() {}),
                  );
                }),
                const SizedBox(height: 10),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    onPressed: _loading ? null : _addQuestion,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Add Question'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _QuestionDraft {
  String type = 'multiple_choice';
  final questionCtrl = TextEditingController();
  final pointsCtrl = TextEditingController(text: '1');
  final correctCtrl = TextEditingController();
  final List<TextEditingController> choiceCtrls = List.generate(
    4,
    (_) => TextEditingController(),
  );
}

class _QuestionCard extends StatelessWidget {
  final int index;
  final _QuestionDraft draft;
  final VoidCallback onDelete;
  final VoidCallback onChanged;
  const _QuestionCard({
    required this.index,
    required this.draft,
    required this.onDelete,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final isMcq = draft.type == 'multiple_choice';
    final isEssay = draft.type == 'essay';
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  'Question ${index + 1}',
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
                const Spacer(),
                IconButton(
                  onPressed: onDelete,
                  icon: const Icon(Icons.delete_outline_rounded),
                ),
              ],
            ),
            DropdownButtonFormField<String>(
              value: draft.type,
              decoration: const InputDecoration(labelText: 'Type'),
              items: const [
                DropdownMenuItem(
                  value: 'multiple_choice',
                  child: Text('Multiple Choice'),
                ),
                DropdownMenuItem(
                  value: 'identification',
                  child: Text('Identification'),
                ),
                DropdownMenuItem(value: 'essay', child: Text('Essay')),
              ],
              onChanged: (v) {
                draft.type = v ?? 'multiple_choice';
                onChanged();
              },
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: draft.questionCtrl,
              decoration: const InputDecoration(labelText: 'Question'),
              maxLines: 2,
            ),
            const SizedBox(height: 10),
            TextFormField(
              controller: draft.pointsCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Points'),
            ),
            if (isMcq) ...[
              const SizedBox(height: 10),
              ...List.generate(4, (i) {
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: TextFormField(
                    controller: draft.choiceCtrls[i],
                    decoration: InputDecoration(labelText: 'Choice ${i + 1}'),
                  ),
                );
              }),
              DropdownButtonFormField<String>(
                value: draft.correctCtrl.text.isEmpty
                    ? null
                    : draft.correctCtrl.text,
                decoration: const InputDecoration(labelText: 'Correct Choice'),
                items: draft.choiceCtrls
                    .map((c) => c.text.trim())
                    .where((c) => c.isNotEmpty)
                    .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                    .toList(),
                onChanged: (v) => draft.correctCtrl.text = v ?? '',
              ),
            ] else if (!isEssay) ...[
              const SizedBox(height: 10),
              TextFormField(
                controller: draft.correctCtrl,
                decoration: const InputDecoration(labelText: 'Correct Answer'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
