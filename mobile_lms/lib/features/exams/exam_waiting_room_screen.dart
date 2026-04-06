import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class ExamWaitingRoomScreen extends StatefulWidget {
  final String examId;
  const ExamWaitingRoomScreen({super.key, required this.examId});

  @override
  State<ExamWaitingRoomScreen> createState() => _ExamWaitingRoomScreenState();
}

class _ExamWaitingRoomScreenState extends State<ExamWaitingRoomScreen> {
  bool _loading = true;
  String? _error;
  String _status = 'loading'; // none|waiting|live|ended
  DateTime? _startedAt;
  Timer? _poll;
  int _secondsElapsed = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _joinAndPoll());
  }

  @override
  void dispose() {
    _poll?.cancel();
    super.dispose();
  }

  Future<void> _joinAndPoll() async {
    if (!mounted) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = context.read<ApiClient>().dio;
      await api.post('/lms/subject-exams/${widget.examId}/session/join');
      await _fetchStatus();
      _poll?.cancel();
      _poll = Timer.periodic(const Duration(seconds: 3), (_) => _fetchStatus());
    } catch (_) {
      _error = 'Unable to join exam. Make sure the instructor opened the session.';
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _fetchStatus() async {
    try {
      final api = context.read<ApiClient>().dio;
      final res = await api.get('/lms/subject-exams/${widget.examId}/session/live');
      final m = res.data is Map ? Map<String, dynamic>.from(res.data as Map) : <String, dynamic>{};
      final status = (m['status'] ?? 'none').toString();
      DateTime? started;
      if (m['session'] is Map && (m['session'] as Map)['started_at'] != null) {
        started = DateTime.tryParse((m['session'] as Map)['started_at'].toString());
      }
      if (!mounted) return;
      setState(() {
        _status = status;
        _startedAt = started;
        if (_status == 'live' && _startedAt != null) {
          _secondsElapsed = DateTime.now().difference(_startedAt!.toLocal()).inSeconds;
        }
      });
    } catch (_) {}
  }

  String get _elapsedDisplay {
    final m = _secondsElapsed ~/ 60;
    final s = _secondsElapsed % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final statusLabel = switch (_status) {
      'waiting' => 'Waiting room',
      'live' => 'Live exam',
      'ended' => 'Ended',
      _ => 'Not open',
    };

    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Exam', showBack: true),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (_loading)
            const Center(child: CircularProgressIndicator(color: LMSTheme.maroon))
          else if (_error != null)
            LMSCard(child: Text(_error!, style: const TextStyle(color: LMSTheme.danger)))
          else ...[
            LMSCard(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(_status == 'live' ? Icons.timer_rounded : Icons.hourglass_bottom_rounded, color: LMSTheme.maroon),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(statusLabel, style: const TextStyle(fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                        const SizedBox(height: 4),
                        Text(
                          _status == 'live' ? 'Elapsed: $_elapsedDisplay' : 'Waiting for instructor to start.',
                          style: TextStyle(color: Colors.grey.shade600, fontSize: 12),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            LMSCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Ready check', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: LMSTheme.ink)),
                  const SizedBox(height: 8),
                  Text(
                    'You can join early and wait here. The countdown starts only when the instructor starts the exam.',
                    style: TextStyle(color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

