import { z } from 'zod';
import { Channels, AssetsSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { listFonts, uploadFonts, deleteFont } from './fonts';
import { listSfx, uploadSfx, deleteSfx } from './sfx';

/**
 * P5-01 ~ P5-03: Assets IPC handler registration.
 */
export function registerAssetsHandlers(): void {
  // fonts
  registerHandler(Channels.Assets.FontsList, z.object({}), () => listFonts());

  registerHandler(Channels.Assets.FontsUpload, z.object({}), async (_req, ctx) =>
    uploadFonts(ctx.senderId),
  );

  registerHandler(Channels.Assets.FontsDelete, AssetsSchemas.FontsDeleteRequest, async (req) =>
    deleteFont(req),
  );

  // sfx
  registerHandler(Channels.Assets.SfxList, AssetsSchemas.SfxListRequest, async (req) =>
    listSfx(req),
  );

  registerHandler(Channels.Assets.SfxUpload, z.object({}), async (_req, ctx) =>
    uploadSfx(ctx.senderId),
  );

  registerHandler(Channels.Assets.SfxDelete, AssetsSchemas.SfxDeleteRequest, async (req) =>
    deleteSfx(req),
  );
}
