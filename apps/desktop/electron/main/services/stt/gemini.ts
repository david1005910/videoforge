import fs from 'node:fs';
import path from 'node:path';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';
import type { SttTranscribeRequest, SttTranscribeResponse } from '@videoforge/shared';

/**
 * P3-03: Gemini STT client.
 *
 * Uses Gemini's generateContent with audio input to transcribe.
 * Returns segments parsed from structured prompt output.
 */
export async function transcribeGemini(req: SttTranscribeRequest): Promise<SttTranscribeResponse> {
  const apiKey = req.apiKey;
  if (!apiKey) {
    throw new UserFacingError('Gemini API 키가 필요합니다', 'Settings에서 API 키를 설정하세요');
  }

  const audioPath = req.audioPath;
  if (!fs.existsSync(audioPath)) {
    throw new UserFacingError(`오디오 파일을 찾을 수 없습니다: ${audioPath}`);
  }

  const audioBuffer = await fs.promises.readFile(audioPath);
  const base64Audio = audioBuffer.toString('base64');
  const ext = path.extname(audioPath).slice(1).toLowerCase();
  const mimeType = MIME_MAP[ext] ?? 'audio/mpeg';

  const model = req.model ?? 'gemini-2.0-flash';

  logger.info({ model, language: req.language, audioPath }, 'stt.gemini.start');

  const prompt = req.wordTimestamps
    ? `Transcribe this audio in ${req.language}. Return a JSON object with this exact structure:
{"text":"full transcription","segments":[{"start":0.0,"end":1.5,"text":"segment text","words":[{"word":"word","start":0.0,"end":0.3}]}]}
Return ONLY valid JSON, no markdown or explanation.`
    : `Transcribe this audio in ${req.language}. Return a JSON object with this exact structure:
{"text":"full transcription","segments":[{"start":0.0,"end":1.5,"text":"segment text"}]}
Return ONLY valid JSON, no markdown or explanation.`;

  let resp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType,
                    data: base64Audio,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
          },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timeout);
  } catch (fetchErr) {
    logger.error({ err: fetchErr }, 'stt.gemini.fetch-error');
    const msg =
      fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'Gemini API 응답 시간 초과 (60초)'
        : 'Gemini API 연결 실패';
    throw new UserFacingError(msg, fetchErr instanceof Error ? fetchErr.message : String(fetchErr));
  }

  if (!resp.ok) {
    const body = await resp.text();
    logger.error({ status: resp.status, body }, 'stt.gemini.error');
    if (resp.status === 401 || resp.status === 403) {
      throw new UserFacingError('Gemini API 키가 유효하지 않습니다');
    }
    throw new UserFacingError(`Gemini STT 실패 (${resp.status})`, body);
  }

  const data = (await resp.json()) as GeminiResponse;
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  // Strip markdown code fences if present (e.g. ```json ... ```)
  const jsonStr = textContent
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed: GeminiTranscription;
  try {
    parsed = JSON.parse(jsonStr) as GeminiTranscription;
  } catch {
    logger.warn({ textContent }, 'stt.gemini.parse-fail');
    // Fallback: treat whole text as single segment
    return {
      segments: [{ id: 0, start: 0, end: 0, text: textContent }],
      language: req.language,
      fullText: textContent,
      durationMs: 0,
    };
  }

  const segments = (parsed.segments ?? []).map((seg, i) => ({
    id: i,
    start: seg.start,
    end: seg.end,
    text: seg.text,
    words: seg.words?.map((w) => ({
      word: w.word,
      start: w.start,
      end: w.end,
    })),
  }));

  const lastSeg = segments[segments.length - 1];
  const durationMs = lastSeg ? lastSeg.end * 1000 : 0;

  logger.info({ segments: segments.length, duration: durationMs }, 'stt.gemini.done');

  return {
    segments,
    language: req.language,
    fullText: parsed.text ?? '',
    durationMs,
  };
}

const MIME_MAP: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
};

interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
  }[];
}

interface GeminiTranscription {
  text?: string;
  segments?: {
    start: number;
    end: number;
    text: string;
    words?: {
      word: string;
      start: number;
      end: number;
    }[];
  }[];
}
