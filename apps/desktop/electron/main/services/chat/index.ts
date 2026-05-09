import { z } from 'zod';
import { Channels, ChatRemoteSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { csChat, dnaScriptChat, thumbnailAnalyze } from './chat-service';

/**
 * P8-05: Chat IPC handler registration.
 */
export function registerChatHandlers(): void {
  registerHandler(Channels.Chat.Cs, ChatRemoteSchemas.ChatCsRequest, async (req) => csChat(req));

  registerHandler(Channels.Chat.CsClear, z.object({}), () => {
    // History is managed client-side; this is a no-op on main
    return Promise.resolve();
  });

  registerHandler(Channels.Chat.Dna, ChatRemoteSchemas.ChatDnaRequest, async (req) =>
    dnaScriptChat(req),
  );

  registerHandler(Channels.Chat.DnaClear, z.object({}), () => {
    // History is managed client-side
    return Promise.resolve();
  });

  registerHandler(Channels.Chat.Thumbnail, ChatRemoteSchemas.ChatThumbnailRequest, async (req) =>
    thumbnailAnalyze(req),
  );
}
