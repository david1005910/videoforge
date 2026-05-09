import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { app } from 'electron';
import { logger } from '../../logger';

/**
 * P9-10: Error report zip generation.
 *
 * Collects logs, preferences, and system info into a zip-like directory
 * (uses directory copy since archiver is not a dependency).
 */
export async function generateErrorReport(outputDir: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportDir = path.join(outputDir, `videoforge-report-${timestamp}`);

  await fs.ensureDir(reportDir);

  // 1. System info
  const systemInfo = {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    electronVersion: process.versions.electron,
    osRelease: os.release(),
    totalMemory: `${Math.round(os.totalmem() / 1024 / 1024)}MB`,
    freeMemory: `${Math.round(os.freemem() / 1024 / 1024)}MB`,
    cpus: os.cpus().length,
    appVersion: app.getVersion(),
    appPath: app.getAppPath(),
    userData: app.getPath('userData'),
    uptime: `${Math.round(process.uptime())}s`,
  };
  await fs.writeJSON(path.join(reportDir, 'system-info.json'), systemInfo, { spaces: 2 });

  // 2. Copy log files
  const logsDir = path.join(app.getPath('userData'), 'Logs');
  const reportLogsDir = path.join(reportDir, 'logs');
  if (await fs.pathExists(logsDir)) {
    await fs.copy(logsDir, reportLogsDir, {
      filter: (src) => {
        const stat = fs.statSync(src);
        // Skip files > 10MB
        return stat.isDirectory() || stat.size < 10 * 1024 * 1024;
      },
    });
  } else {
    await fs.ensureDir(reportLogsDir);
    await fs.writeFile(path.join(reportLogsDir, 'no-logs.txt'), 'No log directory found.');
  }

  // 3. Copy preferences (strip sensitive data)
  const prefsPath = path.join(app.getPath('userData'), 'Settings', 'preferences.json');
  if (await fs.pathExists(prefsPath)) {
    try {
      const prefs = (await fs.readJSON(prefsPath)) as Record<string, unknown>;
      // Remove any potential sensitive fields
      delete prefs.apiKey;
      delete prefs.token;
      await fs.writeJSON(path.join(reportDir, 'preferences.json'), prefs, { spaces: 2 });
    } catch {
      await fs.writeFile(
        path.join(reportDir, 'preferences.txt'),
        'Could not read preferences file.',
      );
    }
  }

  // 4. Automation failure screenshots (last 5)
  const failuresDir = path.join(app.getPath('userData'), 'automation-failures');
  if (await fs.pathExists(failuresDir)) {
    const files = await fs.readdir(failuresDir);
    const recent = files
      .filter((f) => f.endsWith('.png') || f.endsWith('.html'))
      .sort()
      .slice(-10);
    const reportFailuresDir = path.join(reportDir, 'automation-failures');
    await fs.ensureDir(reportFailuresDir);
    for (const file of recent) {
      await fs.copy(path.join(failuresDir, file), path.join(reportFailuresDir, file));
    }
  }

  logger.info({ reportDir }, 'diagnostics.error-report.generated');
  return reportDir;
}
