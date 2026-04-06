import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../constants/app_constants.dart';

class UpdateChecker {
  static bool _isNewer(String latest, String current) {
    final l = latest.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    final c = current.split('.').map((e) => int.tryParse(e) ?? 0).toList();
    for (var i = 0; i < 3; i++) {
      final lv = i < l.length ? l[i] : 0;
      final cv = i < c.length ? c[i] : 0;
      if (lv > cv) return true;
      if (lv < cv) return false;
    }
    return false;
  }
  static Future<void> check(BuildContext context) async {
    try {
      final res = await Dio().get(
        '${AppConstants.baseUrl}/app-version',
        options: Options(sendTimeout: const Duration(seconds: 8), receiveTimeout: const Duration(seconds: 8)),
      );
      final data = res.data as Map<String, dynamic>;

      final latestVersion = data['latest_version']?.toString() ?? '1.0.0';
      final downloadUrl = data['download_url']?.toString() ?? '';
      final forceUpdate = data['force_update'] == true || data['force_update'] == 'true';
      final releaseNotes = data['release_notes']?.toString() ?? '';

      final info = await PackageInfo.fromPlatform();
      final currentVersion = info.version;

      debugPrint('[UpdateChecker] latest=$latestVersion current=$currentVersion force=$forceUpdate');

      final hasUpdate = _isNewer(latestVersion, currentVersion);
      if (!hasUpdate) return;

      if (!context.mounted) return;

      await showDialog(
        context: context,
        barrierDismissible: !forceUpdate,
        builder: (ctx) => PopScope(
          canPop: !forceUpdate,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: const Row(children: [
              Icon(Icons.system_update_rounded, color: Color(0xFF1E40AF)),
              SizedBox(width: 10),
              Text('Update Available', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
            ]),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Version $latestVersion is now available.',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                ),
                if (releaseNotes.isNotEmpty) ...[
                  const SizedBox(height: 10),
                  Text(releaseNotes, style: TextStyle(fontSize: 13, color: Colors.grey.shade600, height: 1.4)),
                ],
                if (forceUpdate) ...[
                  const SizedBox(height: 10),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(children: [
                      Icon(Icons.warning_amber_rounded, color: Colors.red.shade700, size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'This update is required to continue using the app.',
                          style: TextStyle(fontSize: 12, color: Colors.red.shade700),
                        ),
                      ),
                    ]),
                  ),
                ],
              ],
            ),
            actions: [
              if (!forceUpdate)
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Later', style: TextStyle(color: Colors.grey.shade600)),
                ),
              ElevatedButton.icon(
                icon: const Icon(Icons.download_rounded, size: 16),
                label: const Text('Download Update'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1E40AF),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                onPressed: downloadUrl.isEmpty ? null : () async {
                  final uri = Uri.tryParse(downloadUrl);
                  if (uri != null && await canLaunchUrl(uri)) {
                    await launchUrl(uri, mode: LaunchMode.externalApplication);
                  }
                },
              ),
            ],
          ),
        ),
      );
    } catch (e) {
      debugPrint('[UpdateChecker] Error: $e');
    }
  }
}
