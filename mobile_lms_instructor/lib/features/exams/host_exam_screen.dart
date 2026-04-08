import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class HostExamScreen extends StatefulWidget {
  final String examId;
  const HostExamScreen({super.key, required this.examId});

  @override
  State<HostExamScreen> createState() => _HostExamScreenState();
}

class _HostExamScreenState extends State<HostExamScreen> {
  String _status = 'none'; // none|waiting|live|paused|ended
  int _elapsedSeconds = 0;
  int? _remainingSeconds;
  bool _timerEnabled = false;
  int? _durationMinutes;
  bool _loading = true;
  String? _error;
  String _examTitle = 'Exam Session';
  String _examCourse = '';
  List<_StudentStatus> _students = [];
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _loadLiveSession());
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadLiveSession() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await _fetchAndApply();
    } catch (e) {
      _error = 'Failed to load live session.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _silentRefresh() async {
    if (!mounted) return;
    try {
      await _fetchAndApply();
    } catch (_) {}
  }

  Future<void> _fetchAndApply() async {
    final live = await ApiClient().dio.get(
      '/lms/subject-exams/${widget.examId}/session/live',
    );
    final data = live.data is Map
        ? Map<String, dynamic>.from(live.data as Map)
        : <String, dynamic>{};
    final status = (data['status'] ?? 'none').toString();
    final participants = data['participants'] is List
        ? data['participants'] as List
        : <dynamic>[];
    final exam = data['exam'] is Map
        ? Map<String, dynamic>.from(data['exam'] as Map)
        : <String, dynamic>{};
    final te = exam['timer_enabled'];
    final timerOn =
        te == true || te == 1 || te == '1' || te.toString() == 'true';
    final dur = exam['duration_minutes'];
    final durationMin = dur is num ? dur.toInt() : int.tryParse('$dur');

    if (!mounted) return;
    setState(() {
      _status = status;
      _timerEnabled = timerOn;
      _durationMinutes = durationMin;
      _elapsedSeconds = data['elapsed_seconds'] is num
          ? (data['elapsed_seconds'] as num).toInt()
          : _elapsedSeconds;
      _remainingSeconds = data['remaining_seconds'] is num
          ? (data['remaining_seconds'] as num).toInt()
          : null;
      _examTitle = (exam['title'] ?? 'Exam Session').toString();
      _examCourse = (exam['subject_id'] ?? '').toString().isEmpty
          ? ''
          : 'Subject-linked exam';
      _students = participants.map((p) {
        final map = Map<String, dynamic>.from(p as Map);
        final first = (map['first_name'] ?? '').toString();
        final last = (map['last_name'] ?? '').toString();
        final studentNum = (map['student_number'] ?? '').toString();
        final pStatus = (map['status'] ?? 'offline').toString();
        final rawScore = map['auto_score'] ?? map['manual_score'];
        final duration = map['duration_seconds'] is num
            ? (map['duration_seconds'] as num).toInt()
            : 0;
        return _StudentStatus(
          '$first $last'.trim().isEmpty ? studentNum : '$first $last',
          studentNum,
          pStatus == 'in_progress' ? 'online' : pStatus,
          rawScore is num ? rawScore.toInt() : 0,
          duration,
        );
      }).toList();
    });
    _schedulePoll();
  }

  /// Server is source of truth for elapsed/remaining; poll faster while live/paused.
  void _schedulePoll() {
    _pollTimer?.cancel();
    final fast = _status == 'live' || _status == 'paused';
    final interval = fast ? const Duration(seconds: 1) : const Duration(seconds: 5);
    _pollTimer = Timer.periodic(interval, (_) => _silentRefresh());
  }

  Future<void> _actionOpen() async {
    try {
      await ApiClient().dio.post(
        '/lms/subject-exams/${widget.examId}/session/open',
      );
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to open waiting room: $e')),
      );
    }
  }

  Future<void> _actionStart() async {
    try {
      await ApiClient().dio.post(
        '/lms/subject-exams/${widget.examId}/session/start',
      );
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Unable to start session: $e')));
    }
  }

  Future<void> _actionPause() async {
    try {
      await ApiClient().dio.post(
        '/lms/subject-exams/${widget.examId}/session/pause',
      );
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      final text = e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            text.contains('404')
                ? 'Pause endpoint not found on server. Please update/redeploy backend.'
                : 'Unable to pause session: $e',
          ),
        ),
      );
    }
  }

  Future<void> _actionResume() async {
    try {
      await ApiClient().dio.post(
        '/lms/subject-exams/${widget.examId}/session/resume',
      );
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      final text = e.toString();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            text.contains('404')
                ? 'Resume endpoint not found on server. Please update/redeploy backend.'
                : 'Unable to resume session: $e',
          ),
        ),
      );
    }
  }

  Future<void> _actionEnd() async {
    try {
      await ApiClient().dio.post(
        '/lms/subject-exams/${widget.examId}/session/stop',
      );
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text('Unable to end session: $e')));
    }
  }

  void _forceSubmitAll() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text(
          'Force Submit All?',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
        content: const Text(
          'This will immediately end the exam for all currently taking it and submit their current answers.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: LMSTheme.danger),
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiClient().dio.post(
                  '/lms/subject-exams/${widget.examId}/force-submit',
                );
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('All live students were force-submitted.'),
                  ),
                );
                await _loadLiveSession();
              } catch (e) {
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Force submit failed: $e')),
                );
              }
            },
            child: const Text('Force Submit'),
          ),
        ],
      ),
    );
  }

  String _formatMmSs(int totalSeconds) {
    final m = totalSeconds ~/ 60;
    final s = totalSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String get _elapsedTime => _formatMmSs(_elapsedSeconds);

  String? get _countdownOrDurationLabel {
    if (!_timerEnabled || _durationMinutes == null || _durationMinutes! <= 0) {
      return null;
    }
    final full = _durationMinutes! * 60;
    if (_status == 'waiting') {
      return _formatMmSs(full);
    }
    if (_remainingSeconds != null) {
      return _formatMmSs(_remainingSeconds!);
    }
    return _formatMmSs(full);
  }

  Color get _statusColor => switch (_status) {
    'live' => LMSTheme.success,
    'waiting' => LMSTheme.warning,
    'paused' => LMSTheme.lmsPurple,
    'ended' => Colors.grey,
    _ => Colors.grey,
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: AppBar(
        title: const Text(
          'Live Exam Hosting',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w700,
            color: Colors.white,
          ),
        ),
        backgroundColor: LMSTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.go('/dashboard');
            }
          },
        ),
      ),
      body: Column(
        children: [
          // ── Session Controls ──────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LMSTheme.cardBg,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 8,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _examTitle,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: LMSTheme.ink,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _examCourse.isEmpty
                              ? 'Exam ID: ${widget.examId}'
                              : _examCourse,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade600,
                          ),
                        ),
                        if (_status == 'waiting' ||
                            _status == 'live' ||
                            _status == 'paused') ...[
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Icon(
                                Icons.podcasts_rounded,
                                size: 14,
                                color: LMSTheme.success.withValues(alpha: 0.9),
                              ),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'You are hosting this exam — timer syncs from the server.',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.grey.shade700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 6,
                      ),
                      decoration: BoxDecoration(
                        color: _statusColor.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.circle, size: 8, color: _statusColor),
                          const SizedBox(width: 6),
                          Text(
                            _status.toUpperCase(),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                              color: _statusColor,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                if (_status == 'none')
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _actionOpen,
                      icon: const Icon(Icons.door_front_door_rounded, size: 18),
                      label: const Text('Open Waiting Room'),
                    ),
                  ),
                if (_status == 'waiting') ...[
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _actionStart,
                          icon: const Icon(Icons.play_arrow_rounded, size: 18),
                          label: const Text('Start Countdown Now'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _actionEnd,
                          icon: const Icon(
                            Icons.stop_circle_outlined,
                            size: 18,
                          ),
                          label: const Text('End Session'),
                        ),
                      ),
                    ],
                  ),
                  if (_countdownOrDurationLabel != null) ...[
                    const SizedBox(height: 14),
                    Row(
                      children: [
                        const Icon(
                          Icons.timer_outlined,
                          size: 18,
                          color: LMSTheme.maroon,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Scheduled duration: ${_countdownOrDurationLabel!}',
                          style: const TextStyle(
                            fontWeight: FontWeight.w800,
                            fontSize: 15,
                            color: LMSTheme.maroon,
                            fontFeatures: [FontFeature.tabularFigures()],
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
                if (_status == 'live' || _status == 'paused') ...[
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _status == 'live'
                              ? _actionPause
                              : _actionResume,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _status == 'live'
                                ? LMSTheme.warning
                                : LMSTheme.lmsPurple,
                          ),
                          icon: Icon(
                            _status == 'live'
                                ? Icons.pause_rounded
                                : Icons.play_arrow_rounded,
                            size: 18,
                          ),
                          label: Text(
                            _status == 'live'
                                ? 'Pause Session'
                                : 'Resume Session',
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _actionEnd,
                          icon: const Icon(
                            Icons.stop_circle_outlined,
                            size: 18,
                          ),
                          label: const Text('End Session'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(
                              Icons.timer_outlined,
                              size: 16,
                              color: LMSTheme.maroon,
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (_timerEnabled &&
                                      _remainingSeconds != null) ...[
                                    Text(
                                      'Time left: ${_formatMmSs(_remainingSeconds!)}',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w800,
                                        fontSize: 16,
                                        color: LMSTheme.maroon,
                                        fontFeatures: [
                                          FontFeature.tabularFigures(),
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                  ],
                                  Text(
                                    'Elapsed: $_elapsedTime',
                                    style: TextStyle(
                                      fontWeight: FontWeight.w600,
                                      fontSize: 12,
                                      color: Colors.grey.shade700,
                                      fontFeatures: const [
                                        FontFeature.tabularFigures(),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      OutlinedButton(
                        onPressed: _forceSubmitAll,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: LMSTheme.danger,
                          side: const BorderSide(color: LMSTheme.danger),
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          minimumSize: Size.zero,
                        ),
                        child: const Text(
                          'Force Submit All',
                          style: TextStyle(fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ],
                if (_status == 'ended')
                  Text(
                    'Session ended. This exam session cannot be started again.',
                    style: TextStyle(
                      color: Colors.grey.shade700,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 10),

          // ── Student Monitor ────────────────────────
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: LMSTheme.maroon),
                  )
                : _error != null
                ? Center(
                    child: Text(
                      _error!,
                      style: const TextStyle(color: LMSTheme.danger),
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const SectionHeader(title: 'Live Monitor'),
                          Text(
                            '${_students.where((s) => s.status == "online").length} Online',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: LMSTheme.success,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      if (_students.isEmpty)
                        const Padding(
                          padding: EdgeInsets.only(top: 24),
                          child: LMSEmptyState(
                            icon: Icons.groups_2_outlined,
                            title: 'No participants yet',
                            subtitle:
                                'Students who join the live exam will appear here.',
                          ),
                        )
                      else
                        ..._students.map(
                          (s) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: LMSCard(
                              padding: const EdgeInsets.all(12),
                              child: Row(
                                children: [
                                  CircleAvatar(
                                    radius: 18,
                                    backgroundColor: Colors.grey.shade200,
                                    child: Icon(
                                      Icons.person,
                                      color: Colors.grey.shade400,
                                      size: 20,
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          s.name,
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                        Text(
                                          s.id,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: Colors.grey.shade500,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      StatusBadge(
                                        label: s.statusLabel,
                                        color: s.statusColor,
                                      ),
                                      if (s.status == 'online' ||
                                          s.status == 'submitted' ||
                                          s.status == 'auto_submitted' ||
                                          s.status ==
                                              'submitted_pending_review') ...[
                                        const SizedBox(height: 4),
                                        Text(
                                          'Score: ${s.progress}  ·  Time: ${s.durationLabel}',
                                          style: TextStyle(
                                            fontSize: 10,
                                            color: Colors.grey.shade500,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
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

class _StudentStatus {
  final String name, id;
  String status;
  int progress;
  int durationSeconds;
  _StudentStatus(
    this.name,
    this.id,
    this.status,
    this.progress,
    this.durationSeconds,
  );

  String get statusLabel => status.toUpperCase();

  Color get statusColor => switch (status) {
    'online' => LMSTheme.success,
    'offline' => Colors.grey,
    'submitted' => LMSTheme.lmsBlue,
    'auto_submitted' => LMSTheme.warning,
    'submitted_pending_review' => LMSTheme.warning,
    _ => LMSTheme.warning,
  };

  String get durationLabel {
    final m = durationSeconds ~/ 60;
    final s = durationSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }
}
