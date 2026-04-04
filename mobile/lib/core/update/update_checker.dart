import 'package:flutter/material.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../api/api_client.dart';

class UpdateChecker {
  static Future<void> check(BuildContext context) async {
    try {
      final res = await ApiClient().dio.get('/app-version');
      final data = res.data as Map<String, dynamic>;

      final latestVersion = data['latest_version'] as String? ?? '1.0.0';
      final latestBuild = data['build_number'] as int? ?? 1;
      final downloadUrl = data['download_url'] as String? ?? '';
      final forceUpdate = data['force_update'] as bool? ?? false;
      final releaseNotes = data['release_notes'] as String? ?? '';

      if (downloadUrl.isEmpty) return;

      final info = await PackageInfo.fromPlatform();
      final currentBuild = int.tryParse(info.buildNumber) ?? 1;

      final hasUpdate = latestBuild > currentBuild;
      if (!hasUpdate) return;

      if (!context.mounted) return;

      await showDialog(
        context: context,
        barrierDismissible: !forceUpdate,
        builder: (ctx) => PopScope(
          canPop: !forceUpdate,
          child: AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(children: [
              const Icon(Icons.system_update_rounded, color: Color(0xFF1E40AF)),
              const SizedBox(width: 10),
              const Text('Update Available', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
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
                onPressed: () async {
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
    } catch (_) {
      // Silently ignore — don't block app if update check fails
    }
  }
}
