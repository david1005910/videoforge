import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { EdgeTTS } from 'node-edge-tts';
import type { TtsEdgeRequest, TtsResult } from '@videoforge/shared';
import { getCached, putCache, type CacheKey } from './cache';
import { getAudioDuration } from './duration';
import { logger } from '../../logger';

const TEMP_DIR = path.join(os.tmpdir(), 'videoforge', 'tts');

/**
 * Edge TTS 합성 (P2-02).
 *
 * Microsoft Edge 무료 TTS. 네트워크 필요.
 * 결과는 mp3 파일. duration은 ffprobe로 측정.
 */
export async function ttsEdge(req: TtsEdgeRequest): Promise<TtsResult> {
  const cacheKey: CacheKey = {
    provider: 'edge',
    text: req.text,
    voice: req.voice,
    speed: req.speed,
    pitch: req.pitch,
  };

  // 캐시 확인
  const cached = await getCached(cacheKey);
  if (cached) {
    const durationMs = await getAudioDuration(cached);
    return { audioPath: cached, durationMs, cached: true };
  }

  // Edge TTS 합성 (timeout: 텍스트 길이에 비례, 최소 30초)
  const timeoutMs = Math.max(30_000, Math.ceil(req.text.length / 100) * 5_000);
  const tts = new EdgeTTS({
    voice: req.voice,
    rate: formatRate(req.speed),
    pitch: formatPitch(req.pitch),
    timeout: timeoutMs,
  });

  const tempPath = req.outputPath ?? path.join(TEMP_DIR, `${crypto.randomUUID()}.mp3`);
  await fs.ensureDir(path.dirname(tempPath));

  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await tts.ttsPromise(req.text, tempPath);
      break;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTransient =
        msg.includes('Timed out') || msg.includes('ECONNRESET') || msg.includes('EPIPE');

      if (isTransient && attempt < MAX_RETRIES) {
        logger.warn({ attempt: attempt + 1, err: msg }, 'tts.edge.retry');
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      if (msg.includes('ECONNREFUSED') || msg.includes('ETIMEDOUT') || msg.includes('ENOTFOUND')) {
        throw new Error(`네트워크 연결 실패: Edge TTS 서버에 접근할 수 없습니다. (${msg})`);
      }
      throw new Error(`Edge TTS 합성 실패: ${msg}`);
    }
  }

  // duration 측정
  const durationMs = await getAudioDuration(tempPath);

  // 캐시 저장
  const finalPath = req.outputPath ? tempPath : await putCache(cacheKey, tempPath);

  // outputPath 미지정 시 temp 정리
  if (!req.outputPath && finalPath !== tempPath) {
    await fs.remove(tempPath).catch(() => {
      /* noop */
    });
  }

  logger.info({ voice: req.voice, chars: req.text.length, durationMs }, 'tts.edge.done');

  return { audioPath: finalPath, durationMs, cached: false };
}

/** speed 1.0 → "+0%", 1.5 → "+50%", 0.8 → "-20%" */
function formatRate(speed: number): string {
  const pct = Math.round((speed - 1) * 100);
  return pct >= 0 ? `+${pct}%` : `${pct}%`;
}

/** pitch 0 → "+0Hz", 5 → "+5Hz" */
function formatPitch(pitch: number): string {
  return pitch >= 0 ? `+${pitch}Hz` : `${pitch}Hz`;
}
