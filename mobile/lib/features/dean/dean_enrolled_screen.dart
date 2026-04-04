import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class DeanEnrolledScreen extends StatefulWidget {
  const DeanEnrolledScreen({super.key});

  @override
  State<DeanEnrolledScreen> createState() => _DeanEnrolledScreenState();
}

class _DeanEnrolledScreenState extends State<DeanEnrolledScreen> {
  List<dynamic> _batches = [];
  bool _loading = true;
  String? _error;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final res = await ApiClient().dio.get(
        '/enrollment-batches',
        queryParameters: {'limit': 200, 'status': 'enrolled'},
      );
      setState(() { _batches = res.data['data'] ?? []; });
    } catch (e) {
      setState(() { _error = 'Failed to load enrolled students'; });
    } finally {
      setState(() { _loading = false; });
    }
  }

  List<dynamic> get _filtered {
    if (_search.isEmpty) return _batches;
    final q = _search.toLowerCase();
    return _batches.where((b) {
      final name = '${b['first_name']} ${b['last_name']}'.toLowerCase();
      final num = (b['student_number'] ?? '').toLowerCase();
      return name.contains(q) || num.contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filtered;

    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: TextField(
              onChanged: (v) => setState(() => _search = v),
              decoration: InputDecoration(
                hintText: 'Search by name or student number…',
                hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                prefixIcon: Icon(Icons.search_rounded, color: Colors.grey.shade400, size: 20),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.grey.shade200),
                ),
              ),
            ),
          ),
          if (_loading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(child: Center(child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline_rounded, size: 40, color: Colors.grey.shade400),
                const SizedBox(height: 8),
                Text(_error!, style: TextStyle(color: Colors.grey.shade600)),
                const SizedBox(height: 12),
                ElevatedButton(onPressed: _load, child: const Text('Retry')),
              ],
            )))
          else if (filtered.isEmpty)
            const Expanded(child: Center(child: Text('No enrolled students found.')))
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: ListView.separated(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                  itemCount: filtered.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (context, index) {
                    final b = filtered[index];
                    final studentId = b['student_id'] ?? b['id'];
                    final name = '${b['last_name']}, ${b['first_name']}';
                    final initials = '${b['first_name']?[0] ?? ''}${b['last_name']?[0] ?? ''}'.toUpperCase();

                    return Container(
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(14),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.04),
                            blurRadius: 6,
                            offset: const Offset(0, 2),
                          ),
                        ],
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 20,
                              backgroundColor: AppTheme.maroon.withValues(alpha: 0.12),
                              child: Text(
                                initials,
                                style: const TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w800,
                                  color: AppTheme.maroon,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                      fontSize: 13,
                                      color: Color(0xFF1E293B),
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${b['student_number'] ?? '-'} · ${b['course'] ?? '-'} Yr ${b['year_level'] ?? '-'}',
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                                  ),
                                  Text(
                                    '${b['school_year']} · ${b['semester']} Semester',
                                    style: TextStyle(fontSize: 11, color: Colors.grey.shade400),
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: Colors.green.shade50,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.green.shade200),
                                  ),
                                  child: const Text('Enrolled',
                                      style: TextStyle(color: Colors.green, fontSize: 10, fontWeight: FontWeight.w700)),
                                ),
                                const SizedBox(height: 6),
                                GestureDetector(
                                  onTap: studentId != null
                                      ? () => context.push('/dean/transcript/$studentId')
                                      : null,
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                    decoration: BoxDecoration(
                                      color: AppTheme.maroon.withValues(alpha: 0.08),
                                      borderRadius: BorderRadius.circular(20),
                                      border: Border.all(color: AppTheme.maroon.withValues(alpha: 0.25)),
                                    ),
                                    child: const Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.receipt_long_rounded, size: 11, color: AppTheme.maroon),
                                        SizedBox(width: 3),
                                        Text('Transcript',
                                            style: TextStyle(color: AppTheme.maroon, fontSize: 10, fontWeight: FontWeight.w700)),
                                      ],
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
        ],
      ),
    );
  }
}
