import { z } from 'zod';
import { FilePath, TaskId } from './common';

/**
 * audio:merge — 두 트랙 단순 병합
 */
export const AudioMergeRequest = z.object({
  taskId: TaskId.optional(),
  /** 정확히 2개 */
  inputs: z.tuple([FilePath, FilePath]),
  outputPath: FilePath,
  /** 두 번째 트랙의 볼륨 비율 */
  secondaryVolume: z.number().min(0).max(2).default(1),
});
export type AudioMergeRequest = z.infer<typeof AudioMergeRequest>;

export const AudioMergeResponse = z.object({
  outputPath: FilePath,
  durationMs: z.number().nonnegative(),
});
export type AudioMergeResponse = z.infer<typeof AudioMergeResponse>;

/**
 * audio:mergeMulti — N개 트랙 합성 (각 offset/volume 지정)
 */
export const AudioTrackSpec = z.object({
  path: FilePath,
  volume: z.number().min(0).max(2).default(1),
  offsetMs: z.number().int().default(0),
  fadeInMs: z.number().int().nonnegative().default(0),
  fadeOutMs: z.number().int().nonnegative().default(0),
});
export type AudioTrackSpec = z.infer<typeof AudioTrackSpec>;

export const AudioMergeMultiRequest = z.object({
  taskId: TaskId.optional(),
  tracks: z.array(AudioTrackSpec).min(1).max(32),
  outputPath: FilePath,
  outputFormat: z.enum(['mp3', 'wav', 'aac', 'opus']).default('mp3'),
});
export type AudioMergeMultiRequest = z.infer<typeof AudioMergeMultiRequest>;

export const AudioMergeMultiResponse = z.object({
  outputPath: FilePath,
  durationMs: z.number().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
});
export type AudioMergeMultiResponse = z.infer<typeof AudioMergeMultiResponse>;

/**
 * audio:saveExternal — 외부 URL의 오디오를 다운받아 저장
 */
export const AudioSaveExternalRequest = z.object({
  url: z.string().url(),
  outputPath: FilePath.optional(),
  /** 변환 옵션 */
  convertTo: z.enum(['mp3', 'wav', 'original']).default('original'),
});
export type AudioSaveExternalRequest = z.infer<typeof AudioSaveExternalRequest>;

export const AudioSaveExternalResponse = z.object({
  audioPath: FilePath,
  durationMs: z.number().nonnegative(),
});
export type AudioSaveExternalResponse = z.infer<typeof AudioSaveExternalResponse>;

/**
 * audio:saveBlob — 렌더러가 생성한 오디오 Blob을 디스크에 저장
 *
 * IPC payload size 제한 때문에 작은 (<5MB) 오디오만. 더 큰 건 임시 파일 사용.
 */
export const AudioSaveBlobRequest = z.object({
  /** Base64 인코딩된 오디오 데이터 */
  base64Data: z.string().min(1),
  mimeType: z.string().regex(/^audio\//),
  outputPath: FilePath.optional(),
});
export type AudioSaveBlobRequest = z.infer<typeof AudioSaveBlobRequest>;

export const AudioSaveBlobResponse = z.object({
  audioPath: FilePath,
});
export type AudioSaveBlobResponse = z.infer<typeof AudioSaveBlobResponse>;
