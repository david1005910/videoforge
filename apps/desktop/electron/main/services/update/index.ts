import { z } from 'zod';
import { BrowserWindow } from 'electron';
import { autoUpdater, type UpdateCheckResult } from 'electron-updater';
import { Channels } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { logger } from '../../logger';
import type { UpdateStatusEvent } from '@videoforge/shared';

/**
 * P10-01/02: Auto-update integration via electron-updater.
 *
 * Uses GitHub Releases as the update provider.
 */

function broadcastStatus(event: UpdateStatusEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(Channels.Update.On, event);
  }
}

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = logger;

  autoUpdater.on('checking-for-update', () => {
    broadcastStatus({ status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    broadcastStatus({
      status: 'available',
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined,
    });
  });

  autoUpdater.on('update-not-available', () => {
    broadcastStatus({ status: 'not-available' });
  });

  autoUpdater.on('download-progress', (progress) => {
    broadcastStatus({
      status: 'downloading',
      percent: Math.round(progress.percent),
      bytesPerSecond: Math.round(progress.bytesPerSecond),
      totalBytes: progress.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    broadcastStatus({
      status: 'downloaded',
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    broadcastStatus({
      status: 'error',
      errorMessage: String(err),
    });
  });
}

export function registerUpdateHandlers(): void {
  setupAutoUpdater();

  // update:status — get current status
  registerHandler(Channels.Update.Status, z.object({}), () =>
    Promise.resolve({ status: 'idle' as const }),
  );

  // update:recheck — trigger a check
  registerHandler(Channels.Update.Recheck, z.object({}), async () => {
    try {
      const result: UpdateCheckResult | null = await autoUpdater.checkForUpdates();
      return {
        status: result?.updateInfo ? ('available' as const) : ('not-available' as const),
        version: result?.updateInfo?.version,
      };
    } catch (err) {
      logger.error({ err }, 'update.check-failed');
      return { status: 'error' as const, errorMessage: String(err) };
    }
  });

  // update:download — start downloading
  registerHandler(Channels.Update.Download, z.object({}), async () => {
    await autoUpdater.downloadUpdate();
  });

  // update:install — quit and install
  registerHandler(Channels.Update.Install, z.object({}), () => {
    autoUpdater.quitAndInstall(false, true);
    return Promise.resolve();
  });
}
