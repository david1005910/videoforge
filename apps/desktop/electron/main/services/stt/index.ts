import { Channels, SttSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { transcribeOpenAI } from './openai';
import { transcribeGemini } from './gemini';
import { transcribeWhisperLocal } from './whisper-local';
import { alignTranscript } from './align';
import { listModels, downloadModel, deleteModel, downloadBinary } from './whisper-model';
import { logger } from '../../logger';

/**
 * P3-05 + P12: STT IPC handler registration.
 */
export function registerSttHandlers(): void {
  registerHandler(Channels.Stt.Transcribe, SttSchemas.SttTranscribeRequest, async (req) => {
    if (req.provider === 'gemini') {
      return transcribeGemini(req);
    }
    if (req.provider === 'whisper-local') {
      return transcribeWhisperLocal(req);
    }
    return transcribeOpenAI(req);
  });

  registerHandler(Channels.Stt.Align, SttSchemas.SttAlignRequest, (req) =>
    Promise.resolve(alignTranscript(req)),
  );

  // ─── Whisper Model Management (Phase 12) ──────────────────────────

  registerHandler(Channels.Stt.WhisperModels, SttSchemas.WhisperModelsRequest, () =>
    Promise.resolve(listModels()),
  );

  registerHandler(Channels.Stt.WhisperDownload, SttSchemas.WhisperDownloadRequest, async (req) => {
    // If modelId is 'ggml-tiny' and binary isn't ready, download binary first
    // But actually we handle binary download separately via a special check
    return downloadModel(req.modelId, (percent) => {
      logger.debug({ modelId: req.modelId, percent }, 'whisper.download.progress');
    });
  });

  registerHandler(Channels.Stt.WhisperDelete, SttSchemas.WhisperDeleteRequest, async (req) =>
    deleteModel(req.modelId),
  );
}

export { downloadBinary };
