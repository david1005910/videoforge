import { z } from 'zod';
import { FilePath, TaskId, Resolution, ProgressEvent } from './common';

/**
 * ffmpeg pipeline의 한 step.
 *
 * implement.md §5.1 PipelineStep 모델 참조.
 */
export const ConcatStep = z.object({
  kind: z.literal('concat'),
  inputs: z.array(FilePath).min(1),
  /** 재인코딩 회피 가능 시 demuxer 모드 */
  copyOnly: z.boolean().default(false),
});

export const SubtitleBurnStep = z.object({
  kind: z.literal('subtitleBurn'),
  subPath: FilePath,
  fontsDir: FilePath,
  /** ASS 스타일 강제 오버라이드 */
  styleOverride: z.record(z.string()).optional(),
});

export const AudioMixStep = z.object({
  kind: z.literal('audioMix'),
  tracks: z.array(
    z.object({
      path: FilePath,
      volume: z.number().min(0).max(2).default(1),
      offsetMs: z.number().int().default(0),
      /** 페이드 인/아웃 (ms) */
      fadeInMs: z.number().int().nonnegative().default(0),
      fadeOutMs: z.number().int().nonnegative().default(0),
    }),
  ),
});

export const KenBurnsStep = z.object({
  kind: z.literal('kenBurns'),
  image: FilePath,
  durationMs: z.number().int().positive(),
  from: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  to: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
});

export const EffectStep = z.object({
  kind: z.literal('effect'),
  type: z.enum(['fade', 'blur', 'zoom', 'pan', 'shake', 'glow']),
  startMs: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
  params: z.record(z.unknown()).default({}),
});

export const ComposeStep = z.object({
  kind: z.literal('compose'),
  image: FilePath,
  audio: FilePath.optional(),
  subtitlePath: FilePath.optional(),
  /** ASS content as string — written to temp file if subtitlePath is not provided */
  subtitleContent: z.string().optional(),
  fontsDir: FilePath.optional(),
  /** 오디오 없을 때 영상 길이 (ms). 오디오 있으면 오디오 길이 사용 */
  durationMs: z.number().int().positive().optional(),
});

export const ExportStep = z.object({
  kind: z.literal('export'),
  resolution: Resolution,
  codec: z.enum(['h264', 'h265', 'prores']).default('h264'),
  /** 비트레이트 예: "8M", "10M" 또는 CRF 모드의 경우 "crf:23" */
  bitrate: z.string().default('8M'),
  /** 오디오 코덱 */
  audioCodec: z.enum(['aac', 'opus']).default('aac'),
  audioBitrate: z.string().default('192k'),
});

export const PipelineStep = z.discriminatedUnion('kind', [
  ConcatStep,
  SubtitleBurnStep,
  AudioMixStep,
  KenBurnsStep,
  EffectStep,
  ExportStep,
  ComposeStep,
]);
export type PipelineStep = z.infer<typeof PipelineStep>;

/**
 * video:edit
 */
export const VideoEditRequest = z.object({
  taskId: TaskId.optional(),
  outputPath: FilePath,
  pipeline: z.array(PipelineStep).min(1),
  /** 진행률 추적용 총 길이 힌트 (ms). 미지정 시 ffprobe로 자동 측정 */
  totalDurationMs: z.number().int().positive().optional(),
});
export type VideoEditRequest = z.infer<typeof VideoEditRequest>;

export const VideoEditResponse = z.object({
  outputPath: FilePath,
  durationMs: z.number().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
  taskId: TaskId,
});
export type VideoEditResponse = z.infer<typeof VideoEditResponse>;

/**
 * video:cancel
 */
export const VideoCancelRequest = z.object({ taskId: TaskId });
export type VideoCancelRequest = z.infer<typeof VideoCancelRequest>;

/**
 * video:saveTo
 */
export const VideoSaveToRequest = z.object({
  sourcePath: FilePath,
  /** 미지정 시 다이얼로그 띄움 */
  destinationPath: FilePath.optional(),
});
export type VideoSaveToRequest = z.infer<typeof VideoSaveToRequest>;

export const VideoSaveToResponse = z.object({
  savedPath: FilePath,
});
export type VideoSaveToResponse = z.infer<typeof VideoSaveToResponse>;

/**
 * video:applyEffect — 이펙트 미리보기 / 즉시 적용
 */
export const VideoApplyEffectRequest = z.object({
  taskId: TaskId.optional(),
  inputPath: FilePath,
  effect: EffectStep,
  outputPath: FilePath.optional(),
});
export type VideoApplyEffectRequest = z.infer<typeof VideoApplyEffectRequest>;

export const VideoApplyEffectResponse = z.object({
  previewPath: FilePath,
  taskId: TaskId,
});
export type VideoApplyEffectResponse = z.infer<typeof VideoApplyEffectResponse>;

/**
 * video:saveEffect — 이펙트 영상 영구 저장
 */
export const VideoSaveEffectRequest = z.object({
  previewPath: FilePath,
  destinationPath: FilePath,
});
export type VideoSaveEffectRequest = z.infer<typeof VideoSaveEffectRequest>;

/**
 * video:frames:extract
 */
export const VideoFramesExtractRequest = z.object({
  videoPath: FilePath,
  /** 추출할 시각 (ms 또는 'first', 'middle', 'last') */
  timestamps: z.array(z.union([z.number().nonnegative(), z.enum(['first', 'middle', 'last'])])),
  outputDir: FilePath,
  /** 출력 포맷 */
  format: z.enum(['png', 'jpg', 'webp']).default('png'),
  resolution: Resolution.partial().optional(),
});
export type VideoFramesExtractRequest = z.infer<typeof VideoFramesExtractRequest>;

export const VideoFramesExtractResponse = z.object({
  frames: z.array(
    z.object({
      timestampMs: z.number(),
      path: FilePath,
    }),
  ),
});
export type VideoFramesExtractResponse = z.infer<typeof VideoFramesExtractResponse>;

/**
 * video:frames:last — 자주 쓰여서 단축
 */
export const VideoFramesLastRequest = z.object({
  videoPath: FilePath,
  outputPath: FilePath.optional(),
});
export type VideoFramesLastRequest = z.infer<typeof VideoFramesLastRequest>;

export const VideoFramesLastResponse = z.object({
  framePath: FilePath,
});
export type VideoFramesLastResponse = z.infer<typeof VideoFramesLastResponse>;

/**
 * video:subtitleScreenshot — 자막 한 프레임만 렌더링
 */
export const VideoSubtitleScreenshotRequest = z.object({
  assPath: FilePath,
  resolution: Resolution,
  /** 렌더링할 시각 (ms) */
  atMs: z.number().nonnegative(),
  outputPath: FilePath.optional(),
});
export type VideoSubtitleScreenshotRequest = z.infer<typeof VideoSubtitleScreenshotRequest>;

export const VideoSubtitleScreenshotResponse = z.object({
  imagePath: FilePath,
});
export type VideoSubtitleScreenshotResponse = z.infer<typeof VideoSubtitleScreenshotResponse>;

/**
 * video:onProgress (메인 → 렌더러)
 */
export const VideoProgressEvent = ProgressEvent.extend({
  fps: z.number().nonnegative().optional(),
  speed: z.number().nonnegative().optional(),
  currentStep: z.string().optional(),
});
export type VideoProgressEvent = z.infer<typeof VideoProgressEvent>;
