import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../../core/api/api_client.dart';
import '../../core/theme/app_theme.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});
  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _ctrl = MobileScannerController();
  bool _scanned = false;
  bool _loading = false;
  Map<String, dynamic>? _student;
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _onDetect(BarcodeCapture capture) async {
    if (_scanned || _loading) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final value = barcode!.rawValue!;
    // Expected format: SIS-STUDENT:{id}:{studentNumber}
    if (!value.startsWith('SIS-STUDENT:')) {
      setState(() => _error = 'Invalid QR code. Not a SIS student QR.');
      return;
    }

    setState(() { _scanned = true; _loading = true; _error = null; });
    _ctrl.stop();

    try {
      final parts = value.split(':');
      final studentId = parts.length > 1 ? parts[1] : null;
      if (studentId == null) throw Exception('Invalid QR');

      final res = await ApiClient().dio.get('/students/$studentId');
      setState(() {
        _student = Map<String, dynamic>.from(res.data as Map);
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Student not found or invalid QR code.';
        _loading = false;
        _scanned = false;
      });
      _ctrl.start();
    }
  }

  void _reset() {
    setState(() { _student = null; _scanned = false; _error = null; });
    _ctrl.start();
  }

  Widget _infoRow(String label, String? value) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(children: [
      SizedBox(width: 110, child: Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 13))),
      Expanded(child: Text(value ?? '—', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13))),
    ]),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: const Text('Scan Student QR'),
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on_rounded),
            onPressed: _ctrl.toggleTorch,
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_android_rounded),
            onPressed: _ctrl.switchCamera,
          ),
        ],
      ),
      body: _student != null
          ? _buildResult()
          : Stack(
              children: [
                MobileScanner(controller: _ctrl, onDetect: _onDetect),
                // Overlay
                ColorFiltered(
                  colorFilter: ColorFilter.mode(Colors.black.withValues(alpha: 0.5), BlendMode.srcOut),
                  child: Stack(children: [
                    Container(decoration: const BoxDecoration(color: Colors.black, backgroundBlendMode: BlendMode.dstOut)),
                    Center(
                      child: Container(
                        width: 260, height: 260,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                    ),
                  ]),
                ),
                // Corner brackets
                Center(
                  child: SizedBox(
                    width: 260, height: 260,
                    child: Stack(children: [
                      ...[
                        Alignment.topLeft, Alignment.topRight,
                        Alignment.bottomLeft, Alignment.bottomRight,
                      ].map((a) => Align(
                        alignment: a,
                        child: Container(
                          width: 32, height: 32,
                          decoration: BoxDecoration(
                            border: Border(
                              top: a == Alignment.topLeft || a == Alignment.topRight
                                  ? const BorderSide(color: AppTheme.primaryLight, width: 3) : BorderSide.none,
                              bottom: a == Alignment.bottomLeft || a == Alignment.bottomRight
                                  ? const BorderSide(color: AppTheme.primaryLight, width: 3) : BorderSide.none,
                              left: a == Alignment.topLeft || a == Alignment.bottomLeft
                                  ? const BorderSide(color: AppTheme.primaryLight, width: 3) : BorderSide.none,
                              right: a == Alignment.topRight || a == Alignment.bottomRight
                                  ? const BorderSide(color: AppTheme.primaryLight, width: 3) : BorderSide.none,
                            ),
                          ),
                        ),
                      )),
                    ]),
                  ),
                ),
                // Labels
                if (_loading)
                  const Center(child: CircularProgressIndicator(color: Colors.white)),
                Positioned(
                  bottom: 80,
                  left: 0, right: 0,
                  child: Column(children: [
                    if (_error != null)
                      Container(
                        margin: const EdgeInsets.symmetric(horizontal: 32),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.danger.withValues(alpha: 0.9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(_error!, style: const TextStyle(color: Colors.white),
                          textAlign: TextAlign.center),
                      ),
                    const SizedBox(height: 16),
                    Text('Point camera at student\'s QR code',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.8), fontSize: 14),
                      textAlign: TextAlign.center),
                  ]),
                ),
              ],
            ),
    );
  }

  Widget _buildResult() {
    final s = _student!;
    return Container(
      color: const Color(0xFFF8FAFC),
      child: Column(
        children: [
          // Green success banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(20),
            decoration: const BoxDecoration(
              gradient: LinearGradient(colors: [AppTheme.primaryDark, AppTheme.primary]),
            ),
            child: SafeArea(
              bottom: false,
              child: Column(children: [
                const Icon(Icons.check_circle_rounded, color: Colors.white, size: 48),
                const SizedBox(height: 8),
                Text('${s['last_name']}, ${s['first_name']}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
                Text(s['student_number'] ?? '',
                  style: TextStyle(color: Colors.white.withValues(alpha: 0.8), letterSpacing: 2, fontSize: 13)),
              ]),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(children: [
                AppCard(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Student Details', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 12),
                    _infoRow('Course', s['course'] as String?),
                    _infoRow('Year Level', s['year_level'] != null ? 'Year ${s['year_level']}' : null),
                    _infoRow('Status', (s['status'] as String?)?.toUpperCase()),
                    _infoRow('Email', s['email'] as String?),
                    _infoRow('Contact', s['contact_number'] as String?),
                  ]),
                ),
                const SizedBox(height: 16),
                Row(children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _reset,
                      icon: const Icon(Icons.qr_code_scanner_rounded, size: 18),
                      label: const Text('Scan Another'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: const Text('Go Back'),
                    ),
                  ),
                ]),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}
