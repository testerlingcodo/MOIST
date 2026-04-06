import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/lms_theme.dart';

class ExamWaitingRoomScreen extends StatefulWidget {
  final String examId;
  const ExamWaitingRoomScreen({super.key, required this.examId});

  @override
  State<ExamWaitingRoomScreen> createState() => _ExamWaitingRoomScreenState();
}

class _ExamWaitingRoomScreenState extends State<ExamWaitingRoomScreen>
    with SingleTickerProviderStateMixin {
  bool _loading = true;
  String? _error;
  String _status = 'loading';
  Timer? _poll;
  late final AnimationController _pulseCtrl;
  late final Animation<double> _pulseAnim;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
    _pulseAnim = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut),
    );
    WidgetsBinding.instance.addPostFrameCallback((_) => _joinAndPoll());
  }

  @override
  void dispose() {
    _poll?.cancel();
    _pulseCtrl.dispose();
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
      _poll = Timer.periodic(
        const Duration(seconds: 3),
        (_) => _fetchStatus(),
      );
    } catch (_) {
      if (mounted) {
        setState(() {
          _error =
              'Unable to join exam. Make sure the instructor opened the session.';
        });
      }
    }
    if (!mounted) return;
    setState(() => _loading = false);
  }

  Future<void> _fetchStatus() async {
    try {
      final api = context.read<ApiClient>().dio;
      final res = await api.get(
        '/lms/subject-exams/${widget.examId}/session/live',
      );
      final m = res.data is Map
          ? Map<String, dynamic>.from(res.data as Map)
          : <String, dynamic>{};
      final status = (m['status'] ?? 'none').toString();
      if (!mounted) return;
      setState(() => _status = status);
      if (status == 'live' && mounted) {
        _poll?.cancel();
        context.go('/exams/${widget.examId}/take');
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.maroonDark,
      body: SafeArea(
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Colors.white),
              )
            : _error != null
            ? _buildError()
            : _buildWaiting(),
      ),
    );
  }

  Widget _buildError() {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(
              Icons.error_outline_rounded,
              color: Colors.white70,
              size: 40,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'Cannot Join Exam',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.w800,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: TextStyle(
              color: Colors.white.withValues(alpha: 0.7),
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 28),
          ElevatedButton.icon(
            onPressed: _joinAndPoll,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.white,
              foregroundColor: LMSTheme.maroonDark,
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.refresh_rounded),
            label: const Text(
              'Try Again',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () {
              if (context.canPop()) context.pop();
            },
            child: const Text(
              'Go Back',
              style: TextStyle(color: Colors.white70),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaiting() {
    final isLive = _status == 'live';
    final isEnded = _status == 'ended';

    return Column(
      children: [
        // Back button row
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: Row(
            children: [
              IconButton(
                onPressed: () {
                  if (context.canPop()) context.pop();
                },
                icon: const Icon(
                  Icons.arrow_back_ios_new_rounded,
                  color: Colors.white70,
                  size: 18,
                ),
              ),
              const Text(
                'Exam Waiting Room',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),

        Expanded(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Pulsing icon
              ScaleTransition(
                scale: _pulseAnim,
                child: Container(
                  width: 110,
                  height: 110,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: Colors.white.withValues(alpha: 0.08),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.2),
                      width: 2,
                    ),
                  ),
                  child: Icon(
                    isEnded
                        ? Icons.block_rounded
                        : isLive
                        ? Icons.play_circle_rounded
                        : Icons.hourglass_top_rounded,
                    color: isEnded
                        ? Colors.redAccent
                        : isLive
                        ? LMSTheme.goldStrong
                        : Colors.white,
                    size: 52,
                  ),
                ),
              ),

              const SizedBox(height: 32),

              // Status label
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 6,
                ),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _status == 'waiting'
                      ? 'WAITING ROOM'
                      : _status == 'live'
                      ? 'EXAM IS LIVE'
                      : _status == 'ended'
                      ? 'SESSION ENDED'
                      : 'NOT YET OPEN',
                  style: const TextStyle(
                    color: LMSTheme.goldStrong,
                    fontSize: 11,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.5,
                  ),
                ),
              ),

              const SizedBox(height: 16),

              Text(
                isEnded
                    ? 'This exam session has ended.'
                    : isLive
                    ? 'Redirecting you to the exam...'
                    : 'Waiting for the instructor\nto start the exam.',
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                  height: 1.35,
                ),
              ),

              const SizedBox(height: 12),

              Text(
                isEnded
                    ? 'Please contact your instructor.'
                    : 'You\'re all set. Stay on this screen.',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.6),
                  fontSize: 14,
                ),
              ),

              const SizedBox(height: 48),

              // Pulsing dots indicator (only when waiting)
              if (!isEnded)
                _PulsingDots(active: !isLive),
            ],
          ),
        ),

        // Bottom card
        Padding(
          padding: const EdgeInsets.all(20),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.12),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.info_outline_rounded,
                    color: Colors.white60,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Your answers will auto-save as you go. Don\'t close the app during the exam.',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 12,
                      height: 1.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PulsingDots extends StatefulWidget {
  final bool active;
  const _PulsingDots({required this.active});

  @override
  State<_PulsingDots> createState() => _PulsingDotsState();
}

class _PulsingDotsState extends State<_PulsingDots>
    with SingleTickerProviderStateMixin {
  late final AnimationController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    )..repeat();
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.active) return const SizedBox.shrink();
    return AnimatedBuilder(
      animation: _ctrl,
      builder: (_, _) {
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: List.generate(3, (i) {
            final delay = i * 0.3;
            final t = (_ctrl.value - delay).clamp(0.0, 1.0);
            final opacity = (0.3 + 0.7 * (t < 0.5 ? t * 2 : (1 - t) * 2))
                .clamp(0.3, 1.0);
            return Container(
              margin: const EdgeInsets.symmetric(horizontal: 4),
              width: 8,
              height: 8,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.white.withValues(alpha: opacity),
              ),
            );
          }),
        );
      },
    );
  }
}
