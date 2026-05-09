import { Channels, ImagegenSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { whiskUploadRef, whiskGenerate } from './generate';

/**
 * P7-06: Whisk IPC handler registration.
 */
export function registerWhiskHandlers(): void {
  registerHandler(Channels.Whisk.UploadRef, ImagegenSchemas.WhiskUploadRefRequest, async (req) =>
    whiskUploadRef(req),
  );

  registerHandler(Channels.Whisk.Generate, ImagegenSchemas.WhiskGenerateRequest, async (req) =>
    whiskGenerate(req),
  );
}
