import fs from 'node:fs';
import path from 'node:path';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';
import type { SttTranscribeRequest, SttTranscribeResponse } from '@videoforge/shared';

/**
 * P3-02: OpenAI Whisper API STT client.
 *
 * POST https://api.openai.com/v1/audio/transcriptions
 * multipart/form-data with file + model + response_format
 */
export async function transcribeOpenAI(req: SttTranscribeRequest): Promise<SttTranscribeResponse> {
  const apiKey = req.apiKey;
  if (!apiKey) {
    throw new UserFacingError('OpenAI API 키가 필요합니다', 'Settings에서 API 키를 설정하세요');
  }

  const audioPath = req.audioPath;
  if (!fs.existsSync(audioPath)) {
    throw new UserFacingError(`오디오 파일을 찾을 수 없습니다: ${audioPath}`);
  }

  const model = req.model ?? 'whisper-1';
  const fileBuffer = await fs.promises.readFile(audioPath);
  const fileName = path.basename(audioPath);

  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]), fileName);
  formData.append('model', model);
  formData.append('language', req.language);
  formData.append('response_format', 'verbose_json');
  if (req.wordTimestamps) {
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');
  }

  logger.info({ model, language: req.language, audioPath }, 'stt.openai.start');

  let resp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (fetchErr) {
    logger.error({ err: fetchErr }, 'stt.openai.fetch-error');
    const msg =
      fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'OpenAI API 응답 시간 초과 (60초)'
        : 'OpenAI API 연결 실패';
    throw new UserFacingError(msg, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
  }

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body }, 'stt.openai.error');
    if (resp.status === 401) {
      throw new UserFacingError('OpenAI API 키가 유효하지 않습니다');
    }
    throw new UserFacingError(`OpenAI STT 실패 (${resp.status})`, body);
  }

  const data = (await resp.json()) as WhisperVerboseResponse;

  const segments = (data.segments ?? []).map((seg, i) => ({
    id: i,
    start: seg.start,
    end: seg.end,
    text: seg.text,
    confidence: seg.avg_logprob != null ? Math.exp(seg.avg_logprob) : undefined,
    words: seg.words?.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      probability: w.probability,
    })),
  }));

  // word-level timestamps from top-level words array (whisper-1 with word granularity)
  if (req.wordTimestamps && data.words && segments.length > 0) {
    // Distribute top-level words into segments by time range
    for (const seg of segments) {
      if (!seg.words || seg.words.length === 0) {
        seg.words = data.words
          .filter((w) => w.start >= seg.start && w.end <= seg.end)
          .map((w) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            probability: w.probability,
          }));
      }
    }
  }

  const durationMs = data.duration ? data.duration * 1000 : 0;

  logger.info({ segments: segments.length, duration: durationMs }, 'stt.openai.done');

  return {
    segments,
    language: req.language,
    fullText: data.text ?? '',
    durationMs,
  };
}

/** Whisper verbose_json response shape */
interface WhisperVerboseResponse {
  text?: string;
  language?: string;
  duration?: number;
  segments?: {
    start: number;
    end: number;
    text: string;
    avg_logprob?: number;
    words?: {
      word: string;
      start: number;
      end: number;
      probability?: number;
    }[];
  }[];
  words?: {
    word: string;
    start: number;
    end: number;
    probability?: number;
  }[];
}
