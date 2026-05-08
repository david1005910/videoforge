import { z } from 'zod';
import { FilePath } from './common';

/* ========================================================================
 * Google Whisk
 * ======================================================================== */

export const WhiskRefKind = z.enum(['subject', 'scene', 'style']);
export type WhiskRefKind = z.infer<typeof WhiskRefKind>;

/**
 * whisk:uploadRef — subject/scene/style 각각의 참조 이미지 업로드
 */
export const WhiskUploadRefRequest = z.object({
  kind: WhiskRefKind,
  imagePath: FilePath,
});
export type WhiskUploadRefRequest = z.infer<typeof WhiskUploadRefRequest>;

export const WhiskUploadRefResponse = z.object({
  /** Whisk 측에서 발급한 ref ID */
  refId: z.string(),
  kind: WhiskRefKind,
  /** 미리보기용 로컬 캐시 경로 */
  thumbnailPath: FilePath.optional(),
});
export type WhiskUploadRefResponse = z.infer<typeof WhiskUploadRefResponse>;

/**
 * whisk:generate
 */
export const WhiskGenerateRequest = z.object({
  refIds: z.object({
    subject: z.string().optional(),
    scene: z.string().optional(),
    style: z.string().optional(),
  }),
  prompt: z.string().min(1).max(2000),
  count: z.number().int().min(1).max(8).default(4),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).default('16:9'),
  outputDir: FilePath,
});
export type WhiskGenerateRequest = z.infer<typeof WhiskGenerateRequest>;

export const WhiskGenerateResponse = z.object({
  images: z.array(
    z.object({
      path: FilePath,
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  ),
  prompt: z.string(),
});
export type WhiskGenerateResponse = z.infer<typeof WhiskGenerateResponse>;

/* ========================================================================
 * ImageFX
 * ======================================================================== */

export const ImagefxLoginResponse = z.object({
  ok: z.boolean(),
  profilePath: FilePath,
});
export type ImagefxLoginResponse = z.infer<typeof ImagefxLoginResponse>;

export const ImagefxGenerateRequest = z.object({
  prompt: z.string().min(1).max(2000),
  count: z.number().int().min(1).max(8).default(4),
  aspectRatio: z.enum(['1:1', '16:9', '9:16']).default('16:9'),
  outputDir: FilePath,
  /** 시드 (재현용) */
  seed: z.number().int().optional(),
});
export type ImagefxGenerateRequest = z.infer<typeof ImagefxGenerateRequest>;

export const ImagefxGenerateResponse = z.object({
  images: z.array(
    z.object({
      path: FilePath,
      width: z.number().int().positive(),
      height: z.number().int().positive(),
      seed: z.number().int().optional(),
    }),
  ),
  prompt: z.string(),
});
export type ImagefxGenerateResponse = z.infer<typeof ImagefxGenerateResponse>;
