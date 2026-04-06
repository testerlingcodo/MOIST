import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class TakeExamScreen extends StatefulWidget {
  final String examId;
  const TakeExamScreen({super.key, required this.examId});

  @override
  State<TakeExamScreen> createState() => _TakeExamScreenState();
}

class _TakeExamScreenState extends State<TakeExamScreen> {
  int  _currentQ = 0;
  int? _selected;
  final Map<int, dynamic> _answers = {};
  bool _submitted = false;

  // Timer
  int _secondsLeft = 3600; // 1 hour
  Timer? _timer;

  final _questions = const [
    _ExamQ('mcq', 'What is the primary function of an operating system?',
      ['Manage hardware resources', 'Browse the internet',
       'Create documents', 'Play music'], 0),
    _ExamQ('mcq', 'Which data structure uses FIFO?',
      ['Stack', 'Queue', 'Tree', 'Graph'], 1),
    _ExamQ('tf', 'A compiler translates code line by line at runtime.',
      ['True', 'False'], 1),
    _ExamQ('mcq', 'Which is a valid IP address?',
      ['256.1.1.1', '192.168.1.1', '999.999.999.999', '1.2.3.4.5'], 1),
    _ExamQ('identification', 'The process of converting source code to machine code is called ___.',
      [], -1),
    _ExamQ('tf', 'HTTP is a stateless protocol.',
      ['True', 'False'], 0),
    _ExamQ('mcq', 'Which SQL command is used to retrieve data?',
      ['INSERT', 'UPDATE', 'SELECT', 'DELETE'], 2),
    _ExamQ('essay', 'Explain the difference between TCP and UDP protocols. Provide examples.',
      [], -1),
  ];

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (_secondsLeft > 0 && !_submitted) {
        setState(() => _secondsLeft--);
      } else if (_secondsLeft <= 0 && !_submitted) {
        _autoSubmit();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _timeDisplay {
    final h = _secondsLeft ~/ 3600;
    final m = (_secondsLeft % 3600) ~/ 60;
    final s = _secondsLeft % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  Color get _timerColor {
    if (_secondsLeft < 300) return LMSTheme.danger;
    if (_secondsLeft < 900) return LMSTheme.warning;
    return LMSTheme.success;
  }

  void _autoSubmit() {
    _timer?.cancel();
    setState(() => _submitted = true);
    _showResults();
  }

  void _submitExam() {
    if (_selected != null) _answers[_currentQ] = _selected;
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Submit Exam?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Text('You have answered ${_answers.length}/${_questions.length} questions.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _timer?.cancel();
              setState(() => _submitted = true);
              _showResults();
            },
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _showResults() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Exam Submitted!', style: TextStyle(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: LMSTheme.success.withValues(alpha: 0.12),
              ),
              child: const Icon(Icons.check_circle_rounded,
                  color: LMSTheme.success, size: 44),
            ),
            const SizedBox(height: 16),
            Text('${_answers.length}/${_questions.length} questions answered',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
            const SizedBox(height: 8),
            const Text('Your exam has been submitted successfully.\nResults will be available soon.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13)),
          ],
        ),
        actions: [
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
            },
            child: const Text('Back to Exams'),
          ),
        ],
      ),
    );
  }

  void _goToQuestion(int i) {
    if (_selected != null) _answers[_currentQ] = _selected;
    setState(() {
      _currentQ = i;
      _selected = _answers[i] is int ? _answers[i] as int : null;
    });
  }

  @override
  Widget build(BuildContext context) {
    final q = _questions[_currentQ];
    final progress = (_currentQ + 1) / _questions.length;

    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: AppBar(
        backgroundColor: LMSTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Text('Question ${_currentQ + 1}/${_questions.length}',
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 12),
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: _timerColor.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: _timerColor.withValues(alpha: 0.4)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.timer_rounded, color: _timerColor, size: 14),
                const SizedBox(width: 4),
                Text(_timeDisplay, style: TextStyle(
                  color: _timerColor, fontSize: 12, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: LinearProgressIndicator(
            value: progress,
            backgroundColor: Colors.white.withValues(alpha: 0.1),
            color: LMSTheme.goldStrong, minHeight: 4,
          ),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Question type badge
                  StatusBadge(
                    label: q.typeLabel,
                    color: q.typeColor,
                  ),
                  const SizedBox(height: 12),

                  Text(q.question, style: const TextStyle(
                    fontSize: 17, fontWeight: FontWeight.w700, color: LMSTheme.ink)),
                  const SizedBox(height: 20),

                  // Answer area based on type
                  if (q.type == 'mcq' || q.type == 'tf')
                    ...List.generate(q.choices.length, (ci) {
                      final isSelected = _selected == ci;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 10),
                        child: LMSCard(
                          onTap: () => setState(() => _selected = ci),
                          color: isSelected ? LMSTheme.maroon.withValues(alpha: 0.07) : null,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          child: Row(
                            children: [
                              Container(
                                width: 28, height: 28,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? LMSTheme.maroon : Colors.grey.shade200,
                                ),
                                child: Center(
                                  child: isSelected
                                      ? const Icon(Icons.check_rounded, color: Colors.white, size: 16)
                                      : Text(String.fromCharCode(65 + ci),
                                          style: TextStyle(fontWeight: FontWeight.w700,
                                            fontSize: 12, color: Colors.grey.shade600)),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(child: Text(q.choices[ci],
                                style: TextStyle(fontSize: 14,
                                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                  color: LMSTheme.ink))),
                            ],
                          ),
                        ),
                      );
                    })
                  else if (q.type == 'identification')
                    TextFormField(
                      decoration: const InputDecoration(
                        labelText: 'Your Answer',
                        hintText: 'Type your answer here...',
                      ),
                      onChanged: (v) => _answers[_currentQ] = v,
                    )
                  else if (q.type == 'essay')
                    TextFormField(
                      maxLines: 8,
                      decoration: const InputDecoration(
                        labelText: 'Your Essay',
                        hintText: 'Write your answer here...',
                        alignLabelWithHint: true,
                      ),
                      onChanged: (v) => _answers[_currentQ] = v,
                    ),
                ],
              ),
            ),
          ),

          // ── Question nav + actions ──────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            decoration: BoxDecoration(
              color: LMSTheme.cardBg,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8, offset: const Offset(0, -2)),
              ],
            ),
            child: Column(
              children: [
                // Question dots
                SizedBox(
                  height: 32,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: _questions.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 6),
                    itemBuilder: (_, i) {
                      final answered = _answers.containsKey(i);
                      final current = i == _currentQ;
                      return GestureDetector(
                        onTap: () => _goToQuestion(i),
                        child: Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            color: current ? LMSTheme.maroon
                                : answered ? LMSTheme.success.withValues(alpha: 0.15)
                                : Colors.grey.shade200,
                            borderRadius: BorderRadius.circular(8),
                            border: current ? null
                                : Border.all(color: answered
                                    ? LMSTheme.success.withValues(alpha: 0.3)
                                    : Colors.grey.shade300),
                          ),
                          child: Center(
                            child: Text('${i + 1}',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: current ? Colors.white
                                    : answered ? LMSTheme.success
                                    : Colors.grey.shade600)),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    if (_currentQ > 0)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _goToQuestion(_currentQ - 1),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: LMSTheme.maroon,
                            side: const BorderSide(color: LMSTheme.maroon),
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Previous'),
                        ),
                      ),
                    if (_currentQ > 0) const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: _currentQ < _questions.length - 1
                            ? () {
                                if (_selected != null) _answers[_currentQ] = _selected;
                                _goToQuestion(_currentQ + 1);
                              }
                            : _submitExam,
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        child: Text(_currentQ < _questions.length - 1 ? 'Next' : 'Submit Exam'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _ExamQ {
  final String type, question;
  final List<String> choices;
  final int correct;
  const _ExamQ(this.type, this.question, this.choices, this.correct);

  String get typeLabel => switch (type) {
    'mcq' => 'MULTIPLE CHOICE',
    'tf' => 'TRUE / FALSE',
    'identification' => 'IDENTIFICATION',
    'essay' => 'ESSAY',
    _ => type.toUpperCase(),
  };

  Color get typeColor => switch (type) {
    'mcq' => LMSTheme.lmsBlue,
    'tf' => LMSTheme.lmsPurple,
    'identification' => LMSTheme.lmsTeal,
    'essay' => LMSTheme.lmsOrange,
    _ => Colors.grey,
  };
}
