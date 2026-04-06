import 'package:flutter/material.dart';
import '../../core/theme/lms_theme.dart';
import '../../shared/widgets/lms_widgets.dart';

class DiscussionScreen extends StatefulWidget {
  const DiscussionScreen({super.key});

  @override
  State<DiscussionScreen> createState() => _DiscussionScreenState();
}

class _DiscussionScreenState extends State<DiscussionScreen> {
  final _msgCtrl = TextEditingController();

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: LMSTheme.surface,
      appBar: lmsAppBar(context: context, subtitle: 'Discussion Forum', showBack: true),
      body: ListView(
        children: const [
          LMSEmptyState(
            icon: Icons.forum_outlined,
            title: 'Discussion not enabled yet',
            subtitle: 'This will be activated once the discussion backend is added.',
          ),
        ],
      ),
    );
  }
}
