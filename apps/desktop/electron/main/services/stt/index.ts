import { Channels, SttSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { transcribeOpenAI } from './openai';
import { transcribeGemini } from './gemini';
import { alignTranscript } from './align';

/**
 * P3-05: STT IPC 핸들러 등록.
 */
export function registerSttHandlers(): void {
  registerHandler(Channels.Stt.Transcribe, SttSchemas.SttTranscribeRequest, async (req) => {
    if (req.provider === 'gemini') {
      return transcribeGemini(req);
    }
    return transcribeOpenAI(req);
  });

  registerHandler(Channels.Stt.Align, SttSchemas.SttAlignRequest, (req) =>
    Promise.resolve(alignTranscript(req)),
  );
}
