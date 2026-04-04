import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/api/api_client.dart';
import '../../core/auth/auth_service.dart';
import '../../core/theme/app_theme.dart';

class AdminSubjectsScreen extends StatefulWidget {
  const AdminSubjectsScreen({super.key});

  @override
  State<AdminSubjectsScreen> createState() => _AdminSubjectsScreenState();
}

class _AdminSubjectsScreenState extends State<AdminSubjectsScreen> {
  List<dynamic> _subjects = [];
  bool _loading = true;
  String _search = '';
  final _searchCtrl = TextEditingController();

  bool _isMinor(Map<String, dynamic> subject) {
    final value = subject['is_minor'];
    return value == true || value == 1;
  }

  String _curriculumLabel(Map<String, dynamic> subject) {
    return _isMinor(subject) ? 'Minor' : 'Major';
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/subjects', queryParameters: {
        'limit': 100,
        if (_search.isNotEmpty) 'search': _search,
      });
      if (!mounted) return;
      setState(() {
        _subjects = res.data['data'] as List;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  void _showSubjectForm({Map<String, dynamic>? existing}) {
    final codeCtrl = TextEditingController(text: existing?['code']?.toString() ?? '');
    final nameCtrl = TextEditingController(text: existing?['name']?.toString() ?? '');
    final descriptionCtrl =
        TextEditingController(text: existing?['description']?.toString() ?? '');
    final unitsCtrl =
        TextEditingController(text: existing?['units']?.toString() ?? '3');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 16,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade200,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              existing == null ? 'Add Subject' : 'Edit Subject',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: codeCtrl,
              decoration: const InputDecoration(labelText: 'Subject Code'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: nameCtrl,
              decoration: const InputDecoration(labelText: 'Subject Name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: unitsCtrl,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Units'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionCtrl,
              maxLines: 3,
              decoration: const InputDecoration(
                labelText: 'Description',
                alignLabelWithHint: true,
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  if (codeCtrl.text.trim().isEmpty || nameCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      const SnackBar(content: Text('Subject code and name are required.')),
                    );
                    return;
                  }

                  try {
                    final data = {
                      'code': codeCtrl.text.trim(),
                      'name': nameCtrl.text.trim(),
                      'description': descriptionCtrl.text.trim(),
                      'units': int.tryParse(unitsCtrl.text.trim()) ?? 3,
                    };

                    if (existing == null) {
                      await ApiClient().dio.post('/subjects', data: data);
                    } else {
                      await ApiClient().dio.patch('/subjects/${existing['id']}', data: data);
                    }

                    if (ctx.mounted) Navigator.pop(ctx);
                    _load();
                  } catch (e) {
                    if (!ctx.mounted) return;
                    ScaffoldMessenger.of(ctx).showSnackBar(
                      SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
                    );
                  }
                },
                child: Text(existing == null ? 'Create Subject' : 'Save Changes'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _toggleSubject(Map<String, dynamic> subject) async {
    try {
      await ApiClient()
          .dio
          .patch('/subjects/${subject['id']}', data: {'is_active': !(subject['is_active'] == 1 || subject['is_active'] == true)});
      _load();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e'), backgroundColor: AppTheme.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final canManageSubjects = auth.isAdmin || auth.isDean || auth.isRegistrar;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
          color: AppTheme.surface,
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _searchCtrl,
                      textInputAction: TextInputAction.search,
                      decoration: InputDecoration(
                        hintText: 'Search by code or subject name',
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        suffixIcon: _search.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _search = '');
                                  _load();
                                },
                              )
                            : null,
                      ),
                      onChanged: (value) => setState(() => _search = value),
                      onSubmitted: (_) => _load(),
                    ),
                  ),
                  if (canManageSubjects) ...[
                    const SizedBox(width: 10),
                    ElevatedButton.icon(
                      onPressed: () => _showSubjectForm(),
                      icon: const Icon(Icons.add_rounded, size: 18),
                      label: const Text('New'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Text(
                    '${_subjects.length} subjects loaded',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _subjects.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.menu_book_outlined, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No subjects found', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 6, 16, 16),
                        itemCount: _subjects.length,
                        itemBuilder: (context, index) {
                          final subject = _subjects[index] as Map<String, dynamic>;
                          final isActive = subject['is_active'] == 1 || subject['is_active'] == true;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              onTap: canManageSubjects ? () => _showSubjectForm(existing: subject) : null,
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              subject['code']?.toString() ?? '-',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w700,
                                                fontSize: 14,
                                                color: Color(0xFF1E293B),
                                              ),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              subject['name']?.toString() ?? '-',
                                              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                                            ),
                                          ],
                                        ),
                                      ),
                                      StatusBadge(
                                        label: isActive ? 'ACTIVE' : 'INACTIVE',
                                        color: isActive ? AppTheme.success : Colors.grey,
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 8,
                                    runSpacing: 8,
                                    children: [
                                      _InfoChip(
                                        icon: Icons.straighten_rounded,
                                        label: '${subject['units'] ?? 0} units',
                                      ),
                                      if (subject['course'] != null || subject['semester'] != null || _isMinor(subject))
                                        _InfoChip(
                                          icon: Icons.school_rounded,
                                          label: '${_curriculumLabel(subject)} • Year ${subject['year_level'] ?? '-'} • ${subject['semester'] ?? '-'}',
                                        ),
                                      if (subject['schedule_days'] != null || subject['start_time'] != null)
                                        _InfoChip(
                                          icon: Icons.schedule_rounded,
                                          label: '${subject['schedule_days'] ?? 'TBA'} • ${subject['start_time'] != null && subject['end_time'] != null ? '${subject['start_time']}-${subject['end_time']}' : 'No time'}',
                                        ),
                                      if ((subject['description']?.toString().trim() ?? '').isNotEmpty)
                                        _InfoChip(
                                          icon: Icons.notes_rounded,
                                          label: subject['description'].toString(),
                                        ),
                                    ],
                                  ),
                                  if (canManageSubjects) ...[
                                    const SizedBox(height: 12),
                                    Row(
                                      children: [
                                        TextButton(
                                          onPressed: () => _showSubjectForm(existing: subject),
                                          child: const Text('Edit'),
                                        ),
                                        TextButton(
                                          onPressed: () => _toggleSubject(subject),
                                          child: Text(isActive ? 'Deactivate' : 'Activate'),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
      ],
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.grey.shade600),
          const SizedBox(width: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 220),
            child: Text(
              label,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
            ),
          ),
        ],
      ),
    );
  }
}
