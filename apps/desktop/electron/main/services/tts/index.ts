import { Channels, TtsSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { ttsEdge } from './edge';
import { ttsGoogle } from './google';
import { ttsGemini } from './gemini';
import { EDGE_VOICES } from './voices';

/**
 * TTS IPC 핸들러 등록 (P2-06).
 */
export function registerTtsHandlers(): void {
  registerHandler(Channels.Tts.Edge, TtsSchemas.TtsEdgeRequest, async (req) => ttsEdge(req));

  registerHandler(Channels.Tts.Google, TtsSchemas.TtsGoogleRequest, async (req) => ttsGoogle(req));

  registerHandler(Channels.Tts.Gemini, TtsSchemas.TtsGeminiRequest, async (req) => ttsGemini(req));
}

export { EDGE_VOICES };
