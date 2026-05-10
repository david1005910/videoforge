import { z } from 'zod';
import { BrowserWindow } from 'electron';
import { Channels, VideogenSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { logger } from '../../logger';
import { ulid } from 'ulid';
import type {
  VideogenGenerateRequest,
  VideogenGenerateResponse,
  VideogenStatusResponse,
  VideogenCancelRequest,
} from '@videoforge/shared';

const activeTasks = new Map<string, { cancelled: boolean }>();

function broadcastProgress(event: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(Channels.Videogen.OnProgress, event);
  }
}

function _broadcastComplete(event: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(Channels.Videogen.OnComplete, event);
  }
}

function generate(req: VideogenGenerateRequest): VideogenGenerateResponse {
  const taskId = ulid();
  logger.info(
    { taskId, provider: req.provider, prompt: req.prompt.slice(0, 50) },
    'videogen.generate',
  );

  activeTasks.set(taskId, { cancelled: false });

  // Placeholder: actual API call deferred until Veo/Sora APIs are available
  // For now, immediately broadcast queued status
  broadcastProgress({
    taskId,
    percent: 0,
    provider: req.provider,
    phase: 'queued',
    message: `Queued for ${req.provider}`,
  });

  return {
    taskId,
    provider: req.provider,
    queuedAt: new Date().toISOString(),
  };
}

function cancel(req: VideogenCancelRequest): void {
  const task = activeTasks.get(req.taskId);
  if (task) {
    task.cancelled = true;
    activeTasks.delete(req.taskId);
    logger.info({ taskId: req.taskId }, 'videogen.cancelled');
  }
}

function getStatus(): VideogenStatusResponse {
  // Both providers pending official API release
  return {
    veoAvailable: false,
    soraAvailable: false,
  };
}

export function registerVideogenHandlers(): void {
  registerHandler(Channels.Videogen.Generate, VideogenSchemas.VideogenGenerateRequest, (req) =>
    Promise.resolve(generate(req)),
  );

  registerHandler(Channels.Videogen.Cancel, VideogenSchemas.VideogenCancelRequest, (req) => {
    cancel(req);
    return Promise.resolve();
  });

  registerHandler(Channels.Videogen.Status, z.object({}), () => Promise.resolve(getStatus()));
}
