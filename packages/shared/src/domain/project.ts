import { z } from 'zod';
import { Ulid, Sha1, IsoDateTime, FilePath, Resolution, LanguageCode } from '../schemas/common';

/**
 * 도메인 모델 — 사용자 데이터 구조.
 */

export const AssetKind = z.enum(['image', 'audio', 'video', 'ass', 'font', 'sfx']);
export type AssetKind = z.infer<typeof AssetKind>;

export const AssetRef = z.object({
  kind: AssetKind,
  /** 프로젝트 폴더 기준 상대 경로 */
  path: FilePath,
  sha1: Sha1,
  /** 메타데이터 (이미지 prompt, 오디오 duration 등) */
  meta: z.record(z.unknown()).optional(),
});
export type AssetRef = z.infer<typeof AssetRef>;

export const ScenePrompts = z.object({
  whisk: z.string().max(10_000).optional(),
  imagefx: z.string().max(10_000).optional(),
  grok: z.string().max(10_000).optional(),
});
export type ScenePrompts = z.infer<typeof ScenePrompts>;

export const Scene = z.object({
  id: Ulid,
  index: z.number().int().nonnegative(),
  scriptKo: z.string().optional(),
  scriptOriginal: z.string().optional(),
  prompts: ScenePrompts.default({}),
  generatedImages: z.array(AssetRef).default([]),
  generatedClips: z.array(AssetRef).default([]),
  narrationAudio: AssetRef.optional(),
  bgmAudio: AssetRef.optional(),
  subtitleAss: AssetRef.optional(),
  finalClip: AssetRef.optional(),
  notes: z.string().max(50_000).optional(),
});
export type Scene = z.infer<typeof Scene>;

export const ProjectFormatVersion = z.literal('1.0.0');
export type ProjectFormatVersion = z.infer<typeof ProjectFormatVersion>;

export const Project = z.object({
  id: Ulid,
  formatVersion: ProjectFormatVersion,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  language: LanguageCode,
  resolution: Resolution,
  scenes: z.array(Scene),
  /** 프로젝트 폴더 안의 에셋 인덱스 (sha1 → AssetRef) */
  assets: z.record(AssetRef).default({}),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Project = z.infer<typeof Project>;

export const ProjectMeta = z.object({
  id: Ulid,
  title: z.string(),
  language: LanguageCode,
  sceneCount: z.number().int().nonnegative(),
  thumbnailPath: FilePath.optional(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
  /** 디스크 사용량 바이트 */
  sizeBytes: z.number().int().nonnegative(),
});
export type ProjectMeta = z.infer<typeof ProjectMeta>;
