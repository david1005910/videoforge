import { z } from 'zod';
import { Channels, ChatRemoteSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { csChat, dnaScriptChat, thumbnailAnalyze } from './chat-service';
import { loadChatHistory, saveChatHistory, clearChatHistory } from './history';

/**
 * P8-05: Chat IPC handler registration.
 */
export function registerChatHandlers(): void {
  registerHandler(Channels.Chat.Cs, ChatRemoteSchemas.ChatCsRequest, async (req) => csChat(req));

  registerHandler(Channels.Chat.CsClear, z.object({}), () => {
    return Promise.resolve();
  });

  registerHandler(Channels.Chat.Dna, ChatRemoteSchemas.ChatDnaRequest, async (req) =>
    dnaScriptChat(req),
  );

  registerHandler(Channels.Chat.DnaClear, z.object({}), () => {
    return Promise.resolve();
  });

  registerHandler(Channels.Chat.Thumbnail, ChatRemoteSchemas.ChatThumbnailRequest, async (req) =>
    thumbnailAnalyze(req),
  );

  // P8-04: Chat history (per project)
  registerHandler(
    Channels.Chat.HistoryLoad,
    z.object({ projectId: z.string().min(1), mode: z.string().min(1) }),
    async (req) => {
      const messages = await loadChatHistory(req.projectId, req.mode);
      return { messages };
    },
  );

  registerHandler(
    Channels.Chat.HistorySave,
    z.object({
      projectId: z.string().min(1),
      mode: z.string().min(1),
      messages: z.array(ChatRemoteSchemas.ChatMessage),
    }),
    async (req) => {
      await saveChatHistory(req.projectId, req.mode, req.messages);
    },
  );

  registerHandler(
    Channels.Chat.HistoryClear,
    z.object({ projectId: z.string().min(1), mode: z.string().min(1) }),
    async (req) => {
      await clearChatHistory(req.projectId, req.mode);
    },
  );
}
