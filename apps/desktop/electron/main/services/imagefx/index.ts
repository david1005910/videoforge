import { z } from 'zod';
import { Channels, ImagegenSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { imagefxLogin } from './login';
import { imagefxGenerate } from './generate';
import { closeBrowser } from '../grok/browser-pool';

const IMAGEFX_PROFILE = 'imagefx';

/**
 * P7-06: ImageFX IPC handler registration.
 */
export function registerImagefxHandlers(): void {
  registerHandler(Channels.Imagefx.Login, z.object({}), async () => imagefxLogin());

  registerHandler(Channels.Imagefx.Generate, ImagegenSchemas.ImagefxGenerateRequest, async (req) =>
    imagefxGenerate(req),
  );

  registerHandler(Channels.Imagefx.Close, z.object({}), async () => closeBrowser(IMAGEFX_PROFILE));
}
