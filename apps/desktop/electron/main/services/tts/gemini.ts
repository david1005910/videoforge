import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import type { TtsGeminiRequest, TtsResult } from '@videoforge/shared';
import { getCached, putCache, type CacheKey } from './cache';
import { getAudioDuration } from './duration';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';

const TEMP_DIR = path.join(os.tmpdir(), 'videoforge', 'tts');

/**
 * Gemini TTS (P2-04).
 *
 * Google Generative AI REST API.
 * emotion 힌트를 시스템 프롬프트에 반영.
 */
export async function ttsGemini(req: TtsGeminiRequest): Promise<TtsResult> {
  const apiKey = req.apiKey;
  if (!apiKey) {
    throw new UserFacingError(
      'Gemini API 키가 필요합니다.',
      '설정에서 Gemini API 키를 입력하세요.',
    );
  }

  const cacheKey: CacheKey = {
    provider: 'gemini',
    text: req.text,
    voice: req.voice,
    speed: req.speed,
    pitch: req.pitch,
  };

  const cached = await getCached(cacheKey);
  if (cached) {
    const durationMs = await getAudioDuration(cached);
    return { audioPath: cached, durationMs, cached: true };
  }

  // Gemini TTS via generateContent with audio output
  const model = 'gemini-2.5-flash-preview-tts';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const systemInstruction = req.emotion
    ? `Read the following text aloud with the emotion: ${req.emotion}. Speed: ${req.speed}x.`
    : `Read the following text aloud naturally. Speed: ${req.speed}x.`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: req.text }],
      },
    ],
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: req.voice || 'Kore',
          },
        },
      },
    },
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    logger.error({ status: resp.status, body: errBody }, 'tts.gemini.error');
    if (resp.status === 403 || resp.status === 401) {
      throw new UserFacingError('Gemini 인증 실패', 'API 키를 확인하세요.');
    }
    throw new UserFacingError(`Gemini TTS 오류: ${resp.status}`);
  }

  const json = (await resp.json()) as {
    candidates?: {
      content?: {
        parts?: {
          inlineData?: { data: string; mimeType: string };
        }[];
      };
    }[];
  };

  const audioPart = json.candidates?.[0]?.content?.parts?.find((p) =>
    p.inlineData?.mimeType?.startsWith('audio/'),
  );

  if (!audioPart?.inlineData) {
    throw new UserFacingError('Gemini TTS 응답에 오디오가 없습니다.');
  }

  const ext = audioPart.inlineData.mimeType.includes('wav') ? '.wav' : '.mp3';
  const buf = Uint8Array.from(Buffer.from(audioPart.inlineData.data, 'base64'));

  const tempPath = req.outputPath ?? path.join(TEMP_DIR, `${crypto.randomUUID()}${ext}`);
  await fs.ensureDir(path.dirname(tempPath));
  await fs.writeFile(tempPath, buf);

  const durationMs = await getAudioDuration(tempPath);

  const finalPath = req.outputPath ? tempPath : await putCache(cacheKey, tempPath);

  if (!req.outputPath && finalPath !== tempPath) {
    await fs.remove(tempPath).catch(() => {
      /* noop */
    });
  }

  logger.info({ voice: req.voice, chars: req.text.length, durationMs }, 'tts.gemini.done');

  return { audioPath: finalPath, durationMs, cached: false };
}
