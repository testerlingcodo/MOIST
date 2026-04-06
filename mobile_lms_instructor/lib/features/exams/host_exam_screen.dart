import 'dart:async';
import 'package:flutter/material.dart';
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
  bool _isLive = false;
  int _elapsedSeconds = 0;
  Timer? _timer;
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
    _timer?.cancel();
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
      final live = await ApiClient().dio.get('/lms/exams/${widget.examId}/session/live');
      final data = live.data is Map ? Map<String, dynamic>.from(live.data as Map) : <String, dynamic>{};
      final liveFlag = data['live'] == true;
      final participants = data['participants'] is List ? data['participants'] as List : <dynamic>[];
      final session = data['session'] is Map ? Map<String, dynamic>.from(data['session'] as Map) : <String, dynamic>{};
      _isLive = liveFlag;
      if (liveFlag && session['started_at'] != null) {
        final startedAt = DateTime.tryParse(session['started_at'].toString());
        if (startedAt != null) {
          _elapsedSeconds = DateTime.now().difference(startedAt.toLocal()).inSeconds;
        }
      } else {
        _elapsedSeconds = 0;
      }
      _students = participants.map((p) {
        final map = Map<String, dynamic>.from(p as Map);
        final first = (map['first_name'] ?? '').toString();
        final last = (map['last_name'] ?? '').toString();
        final studentNum = (map['student_number'] ?? '').toString();
        final status = (map['status'] ?? 'offline').toString();
        final rawScore = map['auto_score'] ?? map['manual_score'];
        return _StudentStatus(
          '$first $last'.trim().isEmpty ? studentNum : '$first $last',
          studentNum,
          status == 'in_progress' ? 'online' : status,
          rawScore is num ? rawScore.toInt() : 0,
        );
      }).toList();

      if (_isLive) {
        _startTimers();
      } else {
        _timer?.cancel();
      }
    } catch (e) {
      _error = 'Failed to load live session.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  void _startTimers() {
    _timer?.cancel();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsedSeconds += 1);
    });
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      _loadLiveSession();
    });
  }

  Future<void> _toggleLive() async {
    try {
      if (_isLive) {
        await ApiClient().dio.post('/lms/exams/${widget.examId}/session/stop');
      } else {
        await ApiClient().dio.post('/lms/exams/${widget.examId}/session/start');
      }
      await _loadLiveSession();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Unable to update session: $e')),
      );
    }
  }

  void _forceSubmitAll() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Force Submit All?', style: TextStyle(fontWeight: FontWeight.w800)),
        content: const Text('This will immediately end the exam for all currently taking it and submit their current answers.'),
         actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: LMSTheme.danger),
            onPressed: () async {
              Navigator.pop(context);
              try {
                await ApiClient().dio.post('/lms/exams/${widget.examId}/force-submit');
                if (!mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('All live students were force-submitted.')),
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
      )
    );
  }

  String get _elapsedTime {
    final m = _elapsedSeconds ~/ 60;
    final s = _elapsedSeconds % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: AppBar(
        title: const Text('Live Exam Hosting', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
        backgroundColor: LMSTheme.maroonDark,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          // ── Session Controls ──────────────────────
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: LMSTheme.cardBg,
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 8, offset: const Offset(0, 4)),
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
                        Text(_examTitle, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                        const SizedBox(height: 4),
                        Text(_examCourse.isEmpty ? 'Exam ID: ${widget.examId}' : _examCourse, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: (_isLive ? LMSTheme.success : Colors.grey).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.circle, size: 8, color: _isLive ? LMSTheme.success : Colors.grey),
                          const SizedBox(width: 6),
                          Text(_isLive ? 'LIVE' : 'WAITING', style: TextStyle(
                            fontSize: 12, fontWeight: FontWeight.w800, color: _isLive ? LMSTheme.success : Colors.grey)),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: Icon(_isLive ? Icons.pause_rounded : Icons.play_arrow_rounded, size: 18),
                        label: Text(_isLive ? 'Pause Session' : 'Start Exam Session'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isLive ? LMSTheme.warning : LMSTheme.maroon,
                          padding: const EdgeInsets.symmetric(vertical: 14),
                        ),
                        onPressed: _toggleLive,
                      ),
                    ),
                  ],
                ),
                if (_isLive) ...[
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.timer_outlined, size: 16, color: LMSTheme.maroon),
                          const SizedBox(width: 6),
                          Text('Elapsed: $_elapsedTime', style: const TextStyle(fontWeight: FontWeight.w700, color: LMSTheme.maroon)),
                        ],
                      ),
                      OutlinedButton(
                        onPressed: _forceSubmitAll,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: LMSTheme.danger,
                          side: const BorderSide(color: LMSTheme.danger),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          minimumSize: Size.zero,
                        ),
                        child: const Text('Force Submit All', style: TextStyle(fontSize: 12)),
                      ),
                    ],
                  )
                ]
              ],
            ),
          ),

          const SizedBox(height: 10),

          // ── Student Monitor ────────────────────────
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
                : _error != null
                    ? Center(child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)))
                    : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const SectionHeader(title: 'Live Monitor'),
                    Text('${_students.where((s) => s.status == "online").length} Online',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: LMSTheme.success)),
                  ],
                ),
                const SizedBox(height: 10),
                if (_students.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: LMSEmptyState(
                      icon: Icons.groups_2_outlined,
                      title: 'No participants yet',
                      subtitle: 'Students who join the live exam will appear here.',
                    ),
                  )
                else
                  ..._students.map((s) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: LMSCard(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 18,
                          backgroundColor: Colors.grey.shade200,
                          child: Icon(Icons.person, color: Colors.grey.shade400, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(s.name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700)),
                              Text(s.id, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            StatusBadge(label: s.statusLabel, color: s.statusColor),
                            if (s.status == 'online' || s.status == 'submitted') ...[
                              const SizedBox(height: 4),
                              Text('Score: ${s.progress}', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                            ]
                          ],
                        )
                      ],
                    ),
                  )
                ))
              ],
            ),
          )
        ],
      ),
    );
  }
}

class _StudentStatus {
  final String name, id;
  String status;
  int progress;
  _StudentStatus(this.name, this.id, this.status, this.progress);

  String get statusLabel => status.toUpperCase();

  Color get statusColor => switch(status) {
    'online' => LMSTheme.success,
    'offline' => Colors.grey,
    'submitted' => LMSTheme.lmsBlue,
    'auto_submitted' => LMSTheme.warning,
    'submitted_pending_review' => LMSTheme.warning,
    _ => LMSTheme.warning
  };
}
