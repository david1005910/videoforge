import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/tmp/videoforge-test',
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

import { getCached, putCache, getCacheStats, clearCache, cachePath } from './cache';
import type { CacheKey } from './cache';

const TEST_DIR = path.join(os.tmpdir(), 'videoforge-test-tts-cache', `${Date.now()}`);

const testKey: CacheKey = {
  provider: 'edge',
  text: '안녕하세요',
  voice: 'ko-KR-SunHiNeural',
  speed: 1,
  pitch: 0,
};

describe('TTS Cache', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
  });

  afterEach(async () => {
    await clearCache();
    await fs.remove(TEST_DIR);
  });

  it('returns null for cache miss', async () => {
    const result = await getCached(testKey);
    expect(result).toBeNull();
  });

  it('returns path after put', async () => {
    // 테스트 파일 생성
    const srcPath = path.join(TEST_DIR, 'test.mp3');
    await fs.writeFile(srcPath, 'fake audio data');

    const cachedPath = await putCache(testKey, srcPath);
    expect(cachedPath).toContain('.mp3');
    expect(await fs.pathExists(cachedPath)).toBe(true);

    // cache hit
    const hitPath = await getCached(testKey);
    expect(hitPath).toBe(cachedPath);
  });

  it('different keys produce different paths', () => {
    const key2: CacheKey = { ...testKey, text: '다른 텍스트' };
    expect(cachePath(testKey)).not.toBe(cachePath(key2));
  });

  it('same key produces same path', () => {
    expect(cachePath(testKey)).toBe(cachePath(testKey));
  });

  it('getCacheStats counts files', async () => {
    const srcPath = path.join(TEST_DIR, 'test.mp3');
    await fs.writeFile(srcPath, 'fake audio data for stats');

    await putCache(testKey, srcPath);

    const stats = await getCacheStats();
    expect(stats.count).toBeGreaterThanOrEqual(1);
    expect(stats.sizeBytes).toBeGreaterThan(0);
  });

  it('clearCache removes everything', async () => {
    const srcPath = path.join(TEST_DIR, 'test.mp3');
    await fs.writeFile(srcPath, 'data');
    await putCache(testKey, srcPath);

    await clearCache();

    const result = await getCached(testKey);
    expect(result).toBeNull();
  });
});
