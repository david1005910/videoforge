import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import fs from 'fs-extra';
import { logger } from '../../logger';

/**
 * TTS 캐시 (P2-05).
 *
 * text + voice + speed + pitch 해시 → 캐시된 wav 파일 경로.
 * 캐시 디렉토리: ~/Library/Caches/VideoForge/tts/
 */
const CACHE_DIR = path.join(os.homedir(), 'Library', 'Caches', 'VideoForge', 'tts');

export interface CacheKey {
  provider: string;
  text: string;
  voice: string;
  speed: number;
  pitch: number;
}

function hashKey(key: CacheKey): string {
  const raw = JSON.stringify([key.provider, key.text, key.voice, key.speed, key.pitch]);
  return crypto.createHash('sha1').update(raw).digest('hex');
}

export function cachePath(key: CacheKey): string {
  const hash = hashKey(key);
  // 2-char prefix 로 디렉토리 분산
  return path.join(CACHE_DIR, hash.slice(0, 2), `${hash}.mp3`);
}

export async function getCached(key: CacheKey): Promise<string | null> {
  const p = cachePath(key);
  if (await fs.pathExists(p)) {
    logger.debug({ hash: hashKey(key), provider: key.provider }, 'tts.cache.hit');
    return p;
  }
  return null;
}

export async function putCache(key: CacheKey, sourcePath: string): Promise<string> {
  const dest = cachePath(key);
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(sourcePath, dest);
  logger.debug({ hash: hashKey(key), provider: key.provider }, 'tts.cache.put');
  return dest;
}

export async function getCacheStats(): Promise<{ count: number; sizeBytes: number }> {
  if (!(await fs.pathExists(CACHE_DIR))) {
    return { count: 0, sizeBytes: 0 };
  }

  let count = 0;
  let sizeBytes = 0;

  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        count++;
        const stat = await fs.stat(full);
        sizeBytes += stat.size;
      }
    }
  }

  await walk(CACHE_DIR);
  return { count, sizeBytes };
}

export async function clearCache(): Promise<void> {
  await fs.remove(CACHE_DIR);
  logger.info('tts.cache.cleared');
}
