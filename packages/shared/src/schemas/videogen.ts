import { z } from 'zod';
import { FilePath, TaskId, ProgressEvent } from './common';

/* ========================================================================
 * Video Generation (Veo / Sora — official API integration)
 * ======================================================================== */

export const VideogenProvider = z.enum(['veo', 'sora']);
export type VideogenProvider = z.infer<typeof VideogenProvider>;

/**
 * videogen:generate
 */
export const VideogenGenerateRequest = z.object({
  provider: VideogenProvider,
  prompt: z.string().min(1).max(4000),
  /** Reference image for image-to-video */
  imagePath: FilePath.optional(),
  durationSec: z.number().int().min(1).max(60).default(6),
  /** Aspect ratio */
  aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
  outputDir: FilePath,
  apiKey: z.string().min(1),
});
export type VideogenGenerateRequest = z.infer<typeof VideogenGenerateRequest>;

export const VideogenGenerateResponse = z.object({
  taskId: TaskId,
  provider: VideogenProvider,
  queuedAt: z.string().datetime(),
});
export type VideogenGenerateResponse = z.infer<typeof VideogenGenerateResponse>;

/**
 * videogen:status
 */
export const VideogenStatusResponse = z.object({
  veoAvailable: z.boolean(),
  soraAvailable: z.boolean(),
});
export type VideogenStatusResponse = z.infer<typeof VideogenStatusResponse>;

/**
 * videogen:cancel
 */
export const VideogenCancelRequest = z.object({
  taskId: TaskId,
});
export type VideogenCancelRequest = z.infer<typeof VideogenCancelRequest>;

/**
 * videogen:onProgress
 */
export const VideogenProgressEvent = ProgressEvent.extend({
  provider: VideogenProvider,
  phase: z.enum(['queued', 'generating', 'downloading', 'complete', 'failed']),
  message: z.string().optional(),
  /** Downloaded video path on completion */
  outputPath: FilePath.optional(),
});
export type VideogenProgressEvent = z.infer<typeof VideogenProgressEvent>;

/**
 * videogen:onComplete
 */
export const VideogenCompleteEvent = z.object({
  taskId: TaskId,
  provider: VideogenProvider,
  outputPath: FilePath,
  durationMs: z.number().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});
export type VideogenCompleteEvent = z.infer<typeof VideogenCompleteEvent>;
