import { z } from 'zod';
import { BrowserWindow } from 'electron';
import { Channels, GrokSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { grokLogin } from './login';
import { grokGenerate } from './generate';
import { grokBatch, cancelBatch } from './batch';
import { closeBrowser, isBrowserConnected } from './browser-pool';
import { logger } from '../../logger';
import type { GrokProgressEvent, GrokVideoReadyEvent } from '@videoforge/shared';

const GROK_PROFILE = 'grok';

/** Broadcast progress to all renderer windows */
function broadcastProgress(event: GrokProgressEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(Channels.Grok.OnProgress, event);
  }
}

/** Broadcast video ready to all renderer windows */
function broadcastVideoReady(event: GrokVideoReadyEvent): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(Channels.Grok.OnVideoReady, event);
  }
}

/**
 * P6-09 / P6-10: Grok IPC handler registration.
 */
export function registerGrokHandlers(): void {
  // grok:login
  registerHandler(Channels.Grok.Login, z.object({}), async () => grokLogin());

  // grok:generate
  registerHandler(Channels.Grok.Generate, GrokSchemas.GrokGenerateRequest, (req) =>
    Promise.resolve(grokGenerate(req, broadcastProgress, broadcastVideoReady)),
  );

  // grok:batch
  registerHandler(Channels.Grok.Batch, GrokSchemas.GrokBatchRequest, (req) =>
    Promise.resolve(grokBatch(req, broadcastProgress, broadcastVideoReady)),
  );

  // grok:cancel
  registerHandler(Channels.Grok.Cancel, GrokSchemas.GrokCancelRequest, (req) => {
    if (req.batchId) {
      cancelBatch(req.batchId);
    }
    // taskId cancellation: Grok doesn't support mid-generation cancel,
    // but we can close the browser to stop it
    if (req.taskId) {
      logger.info({ taskId: req.taskId }, 'grok.cancel.task');
    }
    return Promise.resolve();
  });

  // grok:close
  registerHandler(Channels.Grok.Close, z.object({}), async () => closeBrowser(GROK_PROFILE));

  // grok:status
  registerHandler(Channels.Grok.Status, z.object({}), () =>
    Promise.resolve({
      loggedIn: isBrowserConnected(GROK_PROFILE),
      browserConnected: isBrowserConnected(GROK_PROFILE),
      queue: { pending: 0, running: 0, completed: 0, failed: 0 },
    }),
  );
}
