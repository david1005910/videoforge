import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import type { TtsGoogleRequest, TtsResult } from '@videoforge/shared';
import { getCached, putCache, type CacheKey } from './cache';
import { getAudioDuration } from './duration';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';

const TEMP_DIR = path.join(os.tmpdir(), 'videoforge', 'tts');

/**
 * Google Cloud TTS (P2-03).
 *
 * REST API 직접 호출. API key 필요.
 */
export async function ttsGoogle(req: TtsGoogleRequest): Promise<TtsResult> {
  const apiKey = req.apiKey;
  if (!apiKey) {
    throw new UserFacingError(
      'Google TTS API 키가 필요합니다.',
      '설정에서 Google Cloud API 키를 입력하세요.',
    );
  }

  const cacheKey: CacheKey = {
    provider: 'google',
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

  // Google TTS REST API
  const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  const body = {
    input: { text: req.text },
    voice: {
      languageCode: req.voice.split('-').slice(0, 2).join('-'),
      name: req.voice,
    },
    audioConfig: {
      audioEncoding: 'MP3',
      speakingRate: req.speed,
      pitch: req.pitch,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => '');
    logger.error({ status: resp.status, body: errBody }, 'tts.google.error');
    if (resp.status === 403 || resp.status === 401) {
      throw new UserFacingError('Google TTS 인증 실패', 'API 키를 확인하세요.');
    }
    throw new UserFacingError(`Google TTS 오류: ${resp.status}`);
  }

  const json = (await resp.json()) as { audioContent: string };
  const buf = Uint8Array.from(Buffer.from(json.audioContent, 'base64'));

  const tempPath = req.outputPath ?? path.join(TEMP_DIR, `${crypto.randomUUID()}.mp3`);
  await fs.ensureDir(path.dirname(tempPath));
  await fs.writeFile(tempPath, buf);

  const durationMs = await getAudioDuration(tempPath);

  const finalPath = req.outputPath ? tempPath : await putCache(cacheKey, tempPath);

  if (!req.outputPath && finalPath !== tempPath) {
    await fs.remove(tempPath).catch(() => {
      /* noop */
    });
  }

  logger.info({ voice: req.voice, chars: req.text.length, durationMs }, 'tts.google.done');

  return { audioPath: finalPath, durationMs, cached: false };
}
