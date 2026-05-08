import { z } from 'zod';
import { FilePath } from './common';

/* ========================================================================
 * Fonts
 * ======================================================================== */

export const FontInfo = z.object({
  family: z.string(),
  fullName: z.string(),
  postscriptName: z.string(),
  /** 시스템 폰트 vs 사용자 추가 */
  source: z.enum(['system', 'bundled', 'user']),
  path: FilePath,
  /** 지원 스크립트 (한국어 / 라틴 / 히브리어 등) */
  scripts: z.array(z.enum(['latin', 'korean', 'chinese', 'japanese', 'hebrew', 'arabic', 'cyrillic', 'thai', 'other'])),
  weight: z.number().int().min(100).max(900).optional(),
  italic: z.boolean().default(false),
});
export type FontInfo = z.infer<typeof FontInfo>;

export const FontsListResponse = z.object({
  fonts: z.array(FontInfo),
});
export type FontsListResponse = z.infer<typeof FontsListResponse>;

export const FontsUploadResponse = z.object({
  /** 업로드된 폰트들 (다중 선택 가능) */
  added: z.array(FontInfo),
  /** 무시된 (중복 / 잘못된 포맷) */
  skipped: z.array(
    z.object({
      filename: z.string(),
      reason: z.string(),
    }),
  ),
});
export type FontsUploadResponse = z.infer<typeof FontsUploadResponse>;

export const FontsDeleteRequest = z.object({
  postscriptName: z.string(),
});
export type FontsDeleteRequest = z.infer<typeof FontsDeleteRequest>;

/* ========================================================================
 * SFX (sound effects library)
 * ======================================================================== */

export const SfxCategory = z.enum([
  'transition',
  'impact',
  'ambient',
  'whoosh',
  'click',
  'notification',
  'other',
]);
export type SfxCategory = z.infer<typeof SfxCategory>;

export const SfxItem = z.object({
  id: z.string(),
  name: z.string(),
  category: SfxCategory,
  durationMs: z.number().nonnegative(),
  path: FilePath,
  /** 사용자 업로드 vs 동봉 */
  source: z.enum(['bundled', 'user']),
  tags: z.array(z.string()).default([]),
});
export type SfxItem = z.infer<typeof SfxItem>;

export const SfxListRequest = z.object({
  category: SfxCategory.optional(),
  query: z.string().optional(),
});
export type SfxListRequest = z.infer<typeof SfxListRequest>;

export const SfxListResponse = z.object({
  items: z.array(SfxItem),
});
export type SfxListResponse = z.infer<typeof SfxListResponse>;

export const SfxUploadResponse = z.object({
  added: z.array(SfxItem),
  skipped: z.array(
    z.object({
      filename: z.string(),
      reason: z.string(),
    }),
  ),
});
export type SfxUploadResponse = z.infer<typeof SfxUploadResponse>;

export const SfxDeleteRequest = z.object({
  id: z.string(),
});
export type SfxDeleteRequest = z.infer<typeof SfxDeleteRequest>;
