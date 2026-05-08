import { z } from 'zod';

/**
 * 공통 빌딩 블록 — 다른 도메인 스키마에서 재사용.
 */

export const Ulid = z
  .string()
  .regex(/^[0-9A-HJKMNP-TV-Z]{26}$/, 'invalid ULID');
export type Ulid = z.infer<typeof Ulid>;

export const Sha1 = z.string().regex(/^[0-9a-f]{40}$/, 'invalid SHA1 hex');
export type Sha1 = z.infer<typeof Sha1>;

export const IsoDateTime = z.string().datetime();
export type IsoDateTime = z.infer<typeof IsoDateTime>;

export const FilePath = z.string().min(1).max(4096);
export type FilePath = z.infer<typeof FilePath>;

export const TaskId = Ulid;
export type TaskId = z.infer<typeof TaskId>;

export const Resolution = z.object({
  w: z.number().int().min(64).max(7680),
  h: z.number().int().min(64).max(4320),
  fps: z.number().min(1).max(120),
});
export type Resolution = z.infer<typeof Resolution>;

export const LanguageCode = z
  .string()
  .min(2)
  .max(10)
  .describe('ISO 639-1 또는 BCP-47, 예: ko, en, he, zh-CN');
export type LanguageCode = z.infer<typeof LanguageCode>;

export const ProgressEvent = z.object({
  taskId: TaskId,
  percent: z.number().min(0).max(100),
  etaMs: z.number().int().nonnegative().optional(),
  step: z.string().optional(),
});
export type ProgressEvent = z.infer<typeof ProgressEvent>;

export const Empty = z.object({}).strict();
export type Empty = z.infer<typeof Empty>;
