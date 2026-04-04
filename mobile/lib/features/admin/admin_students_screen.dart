import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

const List<String> _courseOptions = [
  'BSIT',
  'BSCS',
  'BSA',
  'BSED',
  'BSBA',
  'BSMT',
  'BSME',
  'BSCE',
];

class AdminStudentsScreen extends StatefulWidget {
  const AdminStudentsScreen({super.key});

  @override
  State<AdminStudentsScreen> createState() => _AdminStudentsScreenState();
}

class _AdminStudentsScreenState extends State<AdminStudentsScreen> {
  List<dynamic> _students = [];
  bool _loading = true;
  String _search = '';
  String _courseFilter = '';
  String _yearLevelFilter = '';
  String _statusFilter = '';
  int _page = 1;
  int _total = 0;
  final _searchCtrl = TextEditingController();

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

  Future<void> _load({bool reset = false}) async {
    if (reset) _page = 1;
    setState(() => _loading = true);
    try {
      final res = await ApiClient().dio.get('/students', queryParameters: {
        'page': _page,
        'limit': 20,
        if (_search.isNotEmpty) 'search': _search,
        if (_courseFilter.isNotEmpty) 'course': _courseFilter,
        if (_yearLevelFilter.isNotEmpty) 'year_level': _yearLevelFilter,
        if (_statusFilter.isNotEmpty) 'status': _statusFilter,
      });
      if (!mounted) return;
      setState(() {
        _students = res.data['data'] as List;
        _total = res.data['total'] as int? ?? 0;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  int get _activeFilterCount {
    int count = 0;
    if (_courseFilter.isNotEmpty) count++;
    if (_yearLevelFilter.isNotEmpty) count++;
    if (_statusFilter.isNotEmpty) count++;
    return count;
  }

  void _resetFilters() {
    setState(() {
      _search = '';
      _courseFilter = '';
      _yearLevelFilter = '';
      _statusFilter = '';
      _page = 1;
    });
    _searchCtrl.clear();
    _load(reset: true);
  }

  Future<void> _showFiltersSheet() async {
    String tempCourse = _courseFilter;
    String tempYear = _yearLevelFilter;
    String tempStatus = _statusFilter;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
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
              const Text(
                'Filter Students',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF1E293B),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: tempCourse.isEmpty ? '' : tempCourse,
                decoration: const InputDecoration(labelText: 'Course'),
                items: [
                  const DropdownMenuItem(value: '', child: Text('All courses')),
                  ..._courseOptions.map(
                    (course) => DropdownMenuItem(value: course, child: Text(course)),
                  ),
                ],
                onChanged: (value) => setModalState(() => tempCourse = value ?? ''),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: tempYear.isEmpty ? '' : tempYear,
                decoration: const InputDecoration(labelText: 'Year Level'),
                items: [
                  const DropdownMenuItem(value: '', child: Text('All year levels')),
                  ...List.generate(
                    6,
                    (index) => DropdownMenuItem(
                      value: '${index + 1}',
                      child: Text('Year ${index + 1}'),
                    ),
                  ),
                ],
                onChanged: (value) => setModalState(() => tempYear = value ?? ''),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: tempStatus.isEmpty ? '' : tempStatus,
                decoration: const InputDecoration(labelText: 'Status'),
                items: const [
                  DropdownMenuItem(value: '', child: Text('All statuses')),
                  DropdownMenuItem(value: 'active', child: Text('Active')),
                  DropdownMenuItem(value: 'inactive', child: Text('Inactive')),
                  DropdownMenuItem(value: 'graduated', child: Text('Graduated')),
                  DropdownMenuItem(value: 'dropped', child: Text('Dropped')),
                ],
                onChanged: (value) => setModalState(() => tempStatus = value ?? ''),
              ),
              const SizedBox(height: 20),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        setState(() {
                          _courseFilter = '';
                          _yearLevelFilter = '';
                          _statusFilter = '';
                        });
                        Navigator.pop(ctx);
                        _load(reset: true);
                      },
                      child: const Text('Reset'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        setState(() {
                          _courseFilter = tempCourse;
                          _yearLevelFilter = tempYear;
                          _statusFilter = tempStatus;
                        });
                        Navigator.pop(ctx);
                        _load(reset: true);
                      },
                      child: const Text('Apply Filters'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final totalPages = (_total / 20).ceil();

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
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
                        hintText: 'Search by name or student number',
                        prefixIcon: const Icon(Icons.search_rounded, size: 20),
                        suffixIcon: _search.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                onPressed: () {
                                  _searchCtrl.clear();
                                  setState(() => _search = '');
                                  _load(reset: true);
                                },
                              )
                            : null,
                      ),
                      onChanged: (value) => setState(() => _search = value),
                      onSubmitted: (_) => _load(reset: true),
                    ),
                  ),
                  const SizedBox(width: 10),
                  ElevatedButton.icon(
                    onPressed: _showFiltersSheet,
                    icon: const Icon(Icons.tune_rounded, size: 18),
                    label: Text(_activeFilterCount > 0 ? 'Filters ($_activeFilterCount)' : 'Filters'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Text(
                    '$_total students found',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                  ),
                  const Spacer(),
                  if (_activeFilterCount > 0)
                    TextButton(
                      onPressed: _resetFilters,
                      child: const Text('Clear all'),
                    ),
                ],
              ),
              if (_activeFilterCount > 0) ...[
                const SizedBox(height: 6),
                SizedBox(
                  width: double.infinity,
                  child: Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      if (_courseFilter.isNotEmpty)
                        _FilterChip(label: 'Course: $_courseFilter'),
                      if (_yearLevelFilter.isNotEmpty)
                        _FilterChip(label: 'Year: $_yearLevelFilter'),
                      if (_statusFilter.isNotEmpty)
                        _FilterChip(label: 'Status: ${_statusFilter.toUpperCase()}'),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator())
              : _students.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.people_outline, size: 56, color: Colors.grey.shade300),
                          const SizedBox(height: 12),
                          Text('No students found', style: TextStyle(color: Colors.grey.shade500)),
                        ],
                      ),
                    )
                  : RefreshIndicator(
                      onRefresh: () => _load(reset: false),
                      child: ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: _students.length,
                        itemBuilder: (context, i) {
                          final student = _students[i] as Map<String, dynamic>;
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: AppCard(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              onTap: () => _showStudentDetails(context, student),
                              child: Row(
                                children: [
                                  Container(
                                    width: 42,
                                    height: 42,
                                    decoration: const BoxDecoration(
                                      gradient: LinearGradient(
                                        colors: [AppTheme.primaryDark, AppTheme.primary],
                                      ),
                                      shape: BoxShape.circle,
                                    ),
                                    child: Center(
                                      child: Text(
                                        (student['last_name'] as String? ?? '?')[0].toUpperCase(),
                                        style: const TextStyle(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w700,
                                          fontSize: 16,
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${student['last_name']}, ${student['first_name']}',
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                            fontSize: 14,
                                            color: Color(0xFF1E293B),
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${student['student_number']} | ${student['course'] ?? 'No course'} | Year ${student['year_level'] ?? '-'}',
                                          style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusBadge.fromStatus(student['status'] as String?),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
        ),
        if (_total > 20)
          Container(
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Page $_page of $totalPages',
                  style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                ),
                Row(
                  children: [
                    TextButton(
                      onPressed: _page > 1
                          ? () {
                              _page--;
                              _load();
                            }
                          : null,
                      child: const Text('Prev'),
                    ),
                    TextButton(
                      onPressed: _page < totalPages
                          ? () {
                              _page++;
                              _load();
                            }
                          : null,
                      child: const Text('Next'),
                    ),
                  ],
                ),
              ],
            ),
          ),
      ],
    );
  }

  void _showStudentDetails(BuildContext context, Map<String, dynamic> student) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.92,
        expand: false,
        builder: (_, ctrl) => ListView(
          controller: ctrl,
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 32),
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
            Row(
              children: [
                Container(
                  width: 52,
                  height: 52,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(colors: [AppTheme.primaryDark, AppTheme.primary]),
                    shape: BoxShape.circle,
                  ),
                  child: Center(
                    child: Text(
                      (student['last_name'] as String? ?? '?')[0].toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 20,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${student['last_name']}, ${student['first_name']} ${student['middle_name'] ?? ''}',
                        style: const TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF1E293B),
                        ),
                      ),
                      Text(
                        student['student_number']?.toString() ?? '',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 12, letterSpacing: 1),
                      ),
                    ],
                  ),
                ),
                StatusBadge.fromStatus(student['status'] as String?),
              ],
            ),
            const SizedBox(height: 20),
            Divider(color: Colors.grey.shade100),
            const SizedBox(height: 12),
            _detailRow(Icons.school_outlined, 'Course', student['course']),
            _detailRow(
              Icons.calendar_today_outlined,
              'Year Level',
              student['year_level'] != null ? 'Year ${student['year_level']}' : null,
            ),
            _detailRow(Icons.email_outlined, 'Email', student['email']),
            _detailRow(Icons.phone_outlined, 'Contact', student['contact_number']),
            _detailRow(Icons.location_on_outlined, 'Address', student['address']),
            const SizedBox(height: 20),
            AppCard(
              color: const Color(0xFFF8FAFC),
              child: Column(
                children: [
                  const Text(
                    'Student QR Code',
                    style: TextStyle(
                      fontWeight: FontWeight.w700,
                      fontSize: 14,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'For scanning with the mobile app',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                  ),
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.06), blurRadius: 10),
                      ],
                    ),
                    child: QrImageView(
                      data: 'SIS-STUDENT:${student['id']}:${student['student_number']}',
                      version: QrVersions.auto,
                      size: 160,
                      eyeStyle: const QrEyeStyle(
                        eyeShape: QrEyeShape.square,
                        color: AppTheme.primary,
                      ),
                      dataModuleStyle: const QrDataModuleStyle(
                        dataModuleShape: QrDataModuleShape.square,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(
                    student['student_number']?.toString() ?? '',
                    style: const TextStyle(fontWeight: FontWeight.w700, letterSpacing: 2, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _detailRow(IconData icon, String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(7),
            decoration: BoxDecoration(
              color: AppTheme.primary.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 15, color: AppTheme.primary),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: Colors.grey.shade500,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value?.toString() ?? '-',
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  final String label;

  const _FilterChip({required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.primary.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        label,
        style: const TextStyle(
          fontSize: 11,
          color: AppTheme.primary,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
