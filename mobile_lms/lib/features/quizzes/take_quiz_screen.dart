import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class TakeQuizScreen extends StatefulWidget {
  final String quizId;
  const TakeQuizScreen({super.key, required this.quizId});

  @override
  State<TakeQuizScreen> createState() => _TakeQuizScreenState();
}

class _TakeQuizScreenState extends State<TakeQuizScreen> {
  bool _loading = true;
  bool _submitting = false;
  int _current = 0;
  List<dynamic> _questions = [];
  final Map<String, dynamic> _answers = {};
  String _title = 'Quiz';
  String get _draftKey => 'quiz_draft_${widget.quizId}';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>().dio;
      final qRes = await api.get(
        '/lms/subject-quizzes/${widget.quizId}/questions',
      );
      final list = qRes.data is List ? qRes.data as List : <dynamic>[];
      if (!mounted) return;
      setState(() {
        _questions = list;
        _title = list.isEmpty ? 'Quiz' : 'Quiz (${list.length} items)';
      });
      await _loadDraft();
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to load quiz questions.')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _loadDraft() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_draftKey);
    if (raw == null || raw.isEmpty) return;
    try {
      final m = jsonDecode(raw) as Map<String, dynamic>;
      _current = (m['current'] is num) ? (m['current'] as num).toInt() : 0;
      final ans = m['answers'] is Map
          ? Map<String, dynamic>.from(m['answers'] as Map)
          : <String, dynamic>{};
      _answers
        ..clear()
        ..addAll(ans);
      if (mounted) setState(() {});
    } catch (_) {}
  }

  Future<void> _saveDraft() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      _draftKey,
      jsonEncode({'current': _current, 'answers': _answers}),
    );
  }

  Future<void> _submit() async {
    if (_submitting) return;
    setState(() => _submitting = true);
    try {
      final api = context.read<ApiClient>().dio;
      final res = await api.post(
        '/lms/subject-quizzes/${widget.quizId}/submit',
        data: {'answers': _answers},
      );
      if (!mounted) return;
      final score = (res.data is Map ? (res.data['score'] ?? 0) : 0).toString();
      final passed =
          (res.data is Map &&
          (res.data['passed'] == true || res.data['passed'] == 1));
      await showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Quiz Submitted'),
          content: Text(
            'Score: $score\nResult: ${passed ? 'PASSED' : 'NOT PASSED'}',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      if (context.canPop()) {
        context.pop();
      } else {
        context.go('/quizzes');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to submit quiz: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: _title, showBack: true),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: LMSTheme.maroon),
            )
          : _questions.isEmpty
          ? const Center(child: Text('No quiz questions found.'))
          : Column(
              children: [
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Text(
                        'Question ${_current + 1}/${_questions.length}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                          color: LMSTheme.maroon,
                        ),
                      ),
                      const SizedBox(height: 8),
                      LMSCard(
                        padding: const EdgeInsets.all(16),
                        child: _QuestionAnswer(
                          question: Map<String, dynamic>.from(
                            _questions[_current] as Map,
                          ),
                          value:
                              _answers[(_questions[_current]['id'] ?? '')
                                  .toString()],
                          onChanged: (v) => setState(() {
                            _answers[(_questions[_current]['id'] ?? '')
                                    .toString()] =
                                v;
                            _saveDraft();
                          }),
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(12),
                  color: LMSTheme.cardBg,
                  child: Row(
                    children: [
                      if (_current > 0)
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () {
                              setState(() => _current -= 1);
                              _saveDraft();
                            },
                            child: const Text('Previous'),
                          ),
                        ),
                      if (_current > 0) const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton(
                          onPressed: _submitting
                              ? null
                              : (_current < _questions.length - 1
                                    ? () {
                                        setState(() => _current += 1);
                                        _saveDraft();
                                      }
                                    : _submit),
                          child: Text(
                            _current < _questions.length - 1
                                ? 'Next'
                                : 'Submit Quiz',
                          ),
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

class _QuestionAnswer extends StatelessWidget {
  final Map<String, dynamic> question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  const _QuestionAnswer({
    required this.question,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final type = (question['question_type'] ?? 'multiple_choice').toString();
    final text = (question['question_text'] ?? 'Question').toString();
    final choices =
        (question['choices_json'] is List
                ? question['choices_json'] as List
                : <dynamic>[])
            .map((e) => e.toString())
            .toList();

    if (type == 'multiple_choice' && choices.isNotEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(text, style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 10),
          ...choices.map(
            (c) => RadioListTile<String>(
              value: c,
              groupValue: value?.toString(),
              title: Text(c),
              onChanged: (v) => onChanged(v ?? ''),
            ),
          ),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(text, style: const TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 10),
        TextFormField(
          initialValue: value?.toString() ?? '',
          maxLines: type == 'essay' ? 6 : 2,
          onChanged: onChanged,
          decoration: InputDecoration(
            labelText: type == 'essay' ? 'Essay answer' : 'Answer',
          ),
        ),
      ],
    );
  }
}
