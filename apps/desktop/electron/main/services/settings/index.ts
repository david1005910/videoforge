import path from 'node:path';
import fs from 'fs-extra';
import { app } from 'electron';
import { z } from 'zod';
import { logger } from '../../logger';

/**
 * 사용자 설정 스키마.
 * 새 필드 추가 시 반드시 .default() 지정 — 기존 파일 마이그레이션 불필요하게.
 */
const PreferencesSchema = z.object({
  /** ADR-003: 프로젝트 저장 폴더 (null이면 기본값 사용) */
  projectsDir: z.string().nullable().default(null),
  /** 기본 언어 */
  language: z.enum(['ko', 'en']).default('ko'),
  /** 테마: system 추종 또는 수동 */
  theme: z.enum(['system', 'light', 'dark']).default('system'),
  /** TTS 기본 프로바이더 */
  defaultTtsProvider: z.enum(['edge', 'google', 'gemini']).default('edge'),
  /** STT 기본 프로바이더 */
  defaultSttProvider: z.enum(['openai', 'gemini']).default('openai'),
  /** ffmpeg dev preset (ADR-005) */
  ffmpegPreset: z
    .enum(['ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium'])
    .default('faster'),
  /** 인코딩 동시성 (ADR-005: Intel = 1) */
  maxConcurrentEncodes: z.number().int().min(1).max(4).default(1),
  /** 자동 업데이트 활성화 */
  autoUpdate: z.boolean().default(false),
});

export type Preferences = z.infer<typeof PreferencesSchema>;

let cached: Preferences | null = null;

function settingsPath(): string {
  return path.join(app.getPath('userData'), 'Settings', 'preferences.json');
}

export async function loadPreferences(): Promise<Preferences> {
  if (cached) return cached;

  const filePath = settingsPath();

  if (await fs.pathExists(filePath)) {
    try {
      const raw: unknown = (await fs.readJSON(filePath)) as unknown;
      cached = PreferencesSchema.parse(raw);
      return cached;
    } catch (err) {
      logger.warn({ err }, 'settings.load.fallback');
    }
  }

  // 기본값
  cached = PreferencesSchema.parse({});
  return cached;
}

export async function savePreferences(partial: Partial<Preferences>): Promise<Preferences> {
  const current = await loadPreferences();
  const merged = { ...current, ...partial };
  const validated = PreferencesSchema.parse(merged);

  const filePath = settingsPath();
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeJSON(filePath, validated, { spaces: 2 });

  cached = validated;
  logger.info({ changed: Object.keys(partial) }, 'settings.saved');
  return cached;
}

export function getCachedPreferences(): Preferences {
  if (!cached) {
    cached = PreferencesSchema.parse({});
  }
  return cached;
}
