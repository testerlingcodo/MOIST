import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class TakeExamScreen extends StatefulWidget {
  final String examId;
  const TakeExamScreen({super.key, required this.examId});

  @override
  State<TakeExamScreen> createState() => _TakeExamScreenState();
}

class _TakeExamScreenState extends State<TakeExamScreen>
    with WidgetsBindingObserver {
  bool _loading = true;
  bool _submitting = false;
  int _current = 0;
  List<dynamic> _questions = [];
  final Map<String, dynamic> _answers = {};
  Timer? _ticker;
  Timer? _heartbeat;
  int _elapsed = 0;
  int? _remainingSeconds;
  bool _timerEnabled = false;
  String get _draftKey => 'exam_draft_${widget.examId}';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    _heartbeat?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _syncSessionTimer();
    }
  }

  Future<void> _load() async {
    try {
      final api = context.read<ApiClient>().dio;

      // Load questions
      List<dynamic> list = [];
      String? qError;
      try {
        final qRes = await api.get(
          '/lms/subject-exams/${widget.examId}/questions',
        );
        list = qRes.data is List ? qRes.data as List : <dynamic>[];
      } catch (e) {
        qError = e.toString();
      }

      // Load live session — server is source of truth for timer (stays accurate in background)
      int serverElapsed = 0;
      int? serverRemaining;
      bool timerOn = false;
      try {
        final liveRes = await api.get(
          '/lms/subject-exams/${widget.examId}/session/live',
        );
        final live = liveRes.data is Map
            ? Map<String, dynamic>.from(liveRes.data as Map)
            : <String, dynamic>{};
        final exam = live['exam'] is Map
            ? Map<String, dynamic>.from(live['exam'] as Map)
            : <String, dynamic>{};
        final te = exam['timer_enabled'];
        timerOn =
            te == true || te == 1 || te == '1' || te.toString() == 'true';
        serverElapsed = live['elapsed_seconds'] is num
            ? (live['elapsed_seconds'] as num).toInt()
            : 0;
        serverRemaining = live['remaining_seconds'] is num
            ? (live['remaining_seconds'] as num).toInt()
            : null;
      } catch (_) {}

      if (!mounted) return;
      if (qError != null && list.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Cannot load exam: $qError')),
        );
      }
      setState(() {
        _questions = list;
        _elapsed = serverElapsed;
        _timerEnabled = timerOn;
        _remainingSeconds = serverRemaining;
      });
      await _loadDraft();
      _startTicker();
      _startHeartbeat();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to load exam: $e')),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
      _syncSessionTimer();
    });
  }

  Future<void> _syncSessionTimer() async {
    if (!mounted || _submitting) return;
    try {
      final api = context.read<ApiClient>().dio;
      final liveRes = await api.get(
        '/lms/subject-exams/${widget.examId}/session/live',
      );
      final live = liveRes.data is Map
          ? Map<String, dynamic>.from(liveRes.data as Map)
          : <String, dynamic>{};
      final exam = live['exam'] is Map
          ? Map<String, dynamic>.from(live['exam'] as Map)
          : <String, dynamic>{};
      final te = exam['timer_enabled'];
      final timerOn =
          te == true || te == 1 || te == '1' || te.toString() == 'true';
      final elapsed = live['elapsed_seconds'] is num
          ? (live['elapsed_seconds'] as num).toInt()
          : 0;
      final remaining = live['remaining_seconds'] is num
          ? (live['remaining_seconds'] as num).toInt()
          : null;
      if (!mounted) return;
      setState(() {
        _timerEnabled = timerOn;
        _elapsed = elapsed;
        _remainingSeconds = remaining;
      });
      if (timerOn && remaining != null && remaining <= 0 && !_submitting) {
        await _submit(timeUp: true);
      }
    } catch (_) {}
  }

  void _startHeartbeat() {
    _heartbeat?.cancel();
    _heartbeat = Timer.periodic(const Duration(seconds: 8), (_) async {
      try {
        await context.read<ApiClient>().dio.post(
          '/lms/subject-exams/${widget.examId}/session/heartbeat',
        );
      } catch (_) {}
    });
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

  String _formatMmSs(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String get _timerDisplay {
    if (_timerEnabled && _remainingSeconds != null) {
      return _formatMmSs(_remainingSeconds!.clamp(0, 1 << 30));
    }
    return _formatMmSs(_elapsed);
  }

  int get _answeredCount =>
      _questions.where((q) {
        final id = (q['id'] ?? '').toString();
        final a = _answers[id];
        return a != null && a.toString().isNotEmpty;
      }).length;

  Future<void> _submit({bool timeUp = false}) async {
    final api = context.read<ApiClient>().dio;
    if (timeUp) {
      if (_submitting) return;
      if (!mounted) return;
      setState(() => _submitting = true);
    }
    final unanswered = _questions.length - _answeredCount;
    if (!timeUp && unanswered > 0) {
      if (!mounted) return;
      final confirm = await showDialog<bool>(
        context: context,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: const Text(
            'Submit Exam?',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          content: Text(
            'You have $unanswered unanswered question${unanswered > 1 ? 's' : ''}. '
            'Are you sure you want to submit?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(false),
              child: const Text('Review'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(true),
              child: const Text('Submit Anyway'),
            ),
          ],
        ),
      );
      if (confirm != true) return;
    }

    if (!timeUp) {
      if (_submitting) return;
      setState(() => _submitting = true);
    }
    try {
      final res = await api.post(
        '/lms/subject-exams/${widget.examId}/submit',
        data: {'answers': _answers},
      );
      if (!mounted) return;
      final score = (res.data is Map ? (res.data['auto_score'] ?? 0) : 0)
          .toString();
      final status =
          (res.data is Map ? (res.data['status'] ?? 'submitted') : 'submitted')
              .toString();
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
          contentPadding: const EdgeInsets.all(28),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: LMSTheme.success.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_circle_rounded,
                  color: LMSTheme.success,
                  size: 40,
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                'Exam Submitted!',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                  color: LMSTheme.ink,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                'Auto score: $score',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 14,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                'Status: ${status.replaceAll('_', ' ').toUpperCase()}',
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Done'),
                ),
              ),
            ],
          ),
        ),
      );
      if (!mounted) return;
      final router = GoRouter.of(context);
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_draftKey);
      router.go('/exams');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Failed to submit exam: $e')));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: AppBar(
        backgroundColor: LMSTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            if (context.canPop()) context.pop();
          },
        ),
        title: const Text(
          'Take Exam',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 14),
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 10,
                  vertical: 5,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Row(
                  children: [
                    const Icon(
                      Icons.timer_outlined,
                      size: 14,
                      color: LMSTheme.goldStrong,
                    ),
                    const SizedBox(width: 5),
                    Text(
                      _timerDisplay,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 13,
                        fontFeatures: [FontFeature.tabularFigures()],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
      body: _loading
          ? const Center(
              child: CircularProgressIndicator(color: LMSTheme.maroon),
            )
          : _questions.isEmpty
          ? const Center(child: Text('No exam questions found.'))
          : Column(
              children: [
                // Progress bar
                LinearProgressIndicator(
                  value: _questions.isNotEmpty
                      ? (_current + 1) / _questions.length
                      : 0,
                  backgroundColor: Colors.grey.shade200,
                  color: LMSTheme.maroon,
                  minHeight: 3,
                ),

                // Question number bubbles
                Container(
                  color: LMSTheme.cardBg,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 10,
                  ),
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(_questions.length, (i) {
                        final id =
                            (_questions[i]['id'] ?? '').toString();
                        final answered = _answers[id] != null &&
                            _answers[id].toString().isNotEmpty;
                        final isCurrent = i == _current;
                        return GestureDetector(
                          onTap: () {
                            setState(() => _current = i);
                            _saveDraft();
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            margin: const EdgeInsets.only(right: 6),
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: isCurrent
                                  ? LMSTheme.maroon
                                  : answered
                                  ? LMSTheme.success.withValues(alpha: 0.15)
                                  : Colors.grey.shade100,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: isCurrent
                                    ? LMSTheme.maroon
                                    : answered
                                    ? LMSTheme.success
                                    : Colors.grey.shade300,
                                width: isCurrent ? 2 : 1,
                              ),
                            ),
                            child: Center(
                              child: Text(
                                '${i + 1}',
                                style: TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: isCurrent
                                      ? Colors.white
                                      : answered
                                      ? LMSTheme.success
                                      : Colors.grey.shade500,
                                ),
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                ),

                // Question content
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        children: [
                          Text(
                            'Question ${_current + 1}',
                            style: const TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w800,
                              color: LMSTheme.maroon,
                            ),
                          ),
                          Text(
                            ' of ${_questions.length}',
                            style: TextStyle(
                              fontSize: 13,
                              color: Colors.grey.shade500,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '$_answeredCount/${_questions.length} answered',
                            style: TextStyle(
                              fontSize: 11,
                              color: Colors.grey.shade500,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      LMSCard(
                        padding: const EdgeInsets.all(16),
                        child: _ExamQuestionAnswer(
                          question: Map<String, dynamic>.from(
                            _questions[_current] as Map,
                          ),
                          value: _answers[
                              (_questions[_current]['id'] ?? '').toString()],
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

                // Navigation bar
                Container(
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 16),
                  decoration: BoxDecoration(
                    color: LMSTheme.cardBg,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.06),
                        blurRadius: 8,
                        offset: const Offset(0, -3),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      if (_current > 0)
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () {
                              setState(() => _current -= 1);
                              _saveDraft();
                            },
                            icon: const Icon(Icons.arrow_back_rounded, size: 16),
                            label: const Text('Prev'),
                          ),
                        ),
                      if (_current > 0) const SizedBox(width: 10),
                      Expanded(
                        flex: _current < _questions.length - 1 ? 1 : 2,
                        child: ElevatedButton.icon(
                          onPressed: _submitting
                              ? null
                              : (_current < _questions.length - 1
                                    ? () {
                                        setState(() => _current += 1);
                                        _saveDraft();
                                      }
                                    : _submit),
                          icon: _submitting
                              ? const SizedBox(
                                  width: 16,
                                  height: 16,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white,
                                  ),
                                )
                              : Icon(
                                  _current < _questions.length - 1
                                      ? Icons.arrow_forward_rounded
                                      : Icons.send_rounded,
                                  size: 16,
                                ),
                          label: Text(
                            _submitting
                                ? 'Submitting...'
                                : _current < _questions.length - 1
                                ? 'Next'
                                : 'Submit Exam',
                          ),
                          style: _current == _questions.length - 1
                              ? ElevatedButton.styleFrom(
                                  backgroundColor: LMSTheme.maroon,
                                )
                              : null,
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

class _ExamQuestionAnswer extends StatelessWidget {
  final Map<String, dynamic> question;
  final dynamic value;
  final ValueChanged<dynamic> onChanged;
  const _ExamQuestionAnswer({
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
          Text(
            text,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: LMSTheme.ink,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 14),
          ...choices.map((c) {
            final selected = value?.toString() == c;
            return GestureDetector(
              onTap: () => onChanged(c),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 12,
                ),
                decoration: BoxDecoration(
                  color: selected
                      ? LMSTheme.maroon.withValues(alpha: 0.08)
                      : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: selected ? LMSTheme.maroon : Colors.grey.shade200,
                    width: selected ? 2 : 1,
                  ),
                ),
                child: Row(
                  children: [
                    AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      width: 20,
                      height: 20,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: selected ? LMSTheme.maroon : Colors.transparent,
                        border: Border.all(
                          color: selected
                              ? LMSTheme.maroon
                              : Colors.grey.shade400,
                          width: 2,
                        ),
                      ),
                      child: selected
                          ? const Icon(
                              Icons.check_rounded,
                              size: 12,
                              color: Colors.white,
                            )
                          : null,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        c,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: selected
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: selected ? LMSTheme.maroon : LMSTheme.ink,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          text,
          style: const TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: LMSTheme.ink,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 14),
        TextFormField(
          initialValue: value?.toString() ?? '',
          maxLines: type == 'essay' ? 7 : 2,
          onChanged: onChanged,
          decoration: InputDecoration(
            hintText: type == 'essay'
                ? 'Write your answer here...'
                : 'Type your answer...',
            filled: true,
            fillColor: Colors.grey.shade50,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: BorderSide(color: Colors.grey.shade200),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: LMSTheme.maroon, width: 2),
            ),
          ),
        ),
      ],
    );
  }
}
