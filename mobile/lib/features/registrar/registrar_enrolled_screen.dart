import 'package:flutter/material.dart';
import '../../core/api/api_client.dart';

class RegistrarEnrolledScreen extends StatefulWidget {
  const RegistrarEnrolledScreen({super.key});

  @override
  State<RegistrarEnrolledScreen> createState() => _RegistrarEnrolledScreenState();
}

class _RegistrarEnrolledScreenState extends State<RegistrarEnrolledScreen> {
  List<dynamic> _batches = [];
  bool _loading = true;
  String? _error;

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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
                : _batches.isEmpty
                    ? const Center(child: Text('No enrolled students found.'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _batches.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final b = _batches[index];
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            child: ListTile(
                              title: Text(
                                '${b['last_name']}, ${b['first_name']}',
                                style: const TextStyle(fontWeight: FontWeight.bold),
                              ),
                              subtitle: Text(
                                '${b['student_number']} · ${b['course'] ?? '-'} Year ${b['year_level'] ?? '-'}\n'
                                '${b['school_year']} · ${b['semester']} Semester',
                              ),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.green.shade200),
                                ),
                                child: const Text('Enrolled', style: TextStyle(color: Colors.green, fontSize: 11, fontWeight: FontWeight.w600)),
                              ),
                            ),
                          );
                        },
                      ),
      ),
    );
  }
}
