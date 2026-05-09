import { z } from 'zod';
import { FilePath, TaskId, LanguageCode, ProgressEvent } from './common';

/**
 * STT segment — Whisper API 출력 형식.
 */
export const SttSegment = z.object({
  id: z.number().int().nonnegative(),
  start: z.number().nonnegative(), // seconds
  end: z.number().nonnegative(),
  text: z.string(),
  /** 신뢰도 (0~1) */
  confidence: z.number().min(0).max(1).optional(),
  /** 단어 단위 타임코드 (Whisper word_timestamps=true) */
  words: z
    .array(
      z.object({
        word: z.string(),
        start: z.number(),
        end: z.number(),
        probability: z.number().optional(),
      }),
    )
    .optional(),
});
export type SttSegment = z.infer<typeof SttSegment>;

/**
 * 정렬된 단어 — script와 STT 출력을 매칭한 결과.
 */
export const AlignedWord = z.object({
  word: z.string(),
  /** 원본 스크립트의 인덱스 */
  scriptIndex: z.number().int().nonnegative(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
  /** 정렬 신뢰도 */
  confidence: z.number().min(0).max(1).optional(),
});
export type AlignedWord = z.infer<typeof AlignedWord>;

/**
 * stt:transcribe
 */
export const SttTranscribeRequest = z.object({
  audioPath: FilePath,
  language: LanguageCode,
  provider: z.enum(['openai', 'gemini', 'whisper-local']).default('openai'),
  apiKey: z.string().optional(),
  /** 모델 (예: whisper-1, gpt-4o-transcribe) */
  model: z.string().optional(),
  /** 단어 타임스탬프 포함 여부 */
  wordTimestamps: z.boolean().default(true),
  taskId: TaskId.optional(),
});
export type SttTranscribeRequest = z.infer<typeof SttTranscribeRequest>;

export const SttTranscribeResponse = z.object({
  segments: z.array(SttSegment),
  language: LanguageCode,
  /** 전체 추출 텍스트 */
  fullText: z.string(),
  durationMs: z.number().nonnegative(),
});
export type SttTranscribeResponse = z.infer<typeof SttTranscribeResponse>;

/**
 * stt:align — 사용자가 가진 정확한 스크립트와 STT 결과를 매칭.
 */
export const SttAlignRequest = z.object({
  /** 사용자가 작성한 정확한 스크립트 */
  transcript: z.string().min(1).max(500_000),
  /** STT가 뽑은 segment들 */
  sttSegments: z.array(SttSegment),
  language: LanguageCode,
});
export type SttAlignRequest = z.infer<typeof SttAlignRequest>;

export const SttAlignResponse = z.object({
  words: z.array(AlignedWord),
  /** 정렬 실패한 단어 인덱스 */
  unalignedIndexes: z.array(z.number().int()),
  /** 평균 신뢰도 */
  averageConfidence: z.number().min(0).max(1),
});
export type SttAlignResponse = z.infer<typeof SttAlignResponse>;

/**
 * stt:getToken — 일부 프로바이더는 단기 토큰 필요
 */
export const SttGetTokenRequest = z.object({
  provider: z.enum(['openai', 'gemini', 'edge']),
});
export type SttGetTokenRequest = z.infer<typeof SttGetTokenRequest>;

export const SttGetTokenResponse = z.object({
  token: z.string(),
  expiresAt: z.string().datetime(),
});
export type SttGetTokenResponse = z.infer<typeof SttGetTokenResponse>;

/**
 * stt:onProgress
 */
export const SttProgressEvent = ProgressEvent.extend({
  phase: z.enum(['upload', 'transcribe', 'align', 'download']),
});
export type SttProgressEvent = z.infer<typeof SttProgressEvent>;

// ─── Whisper Local Model Management ────────────────────────────────

export const WhisperModelId = z.enum([
  'ggml-tiny',
  'ggml-tiny.en',
  'ggml-base',
  'ggml-base.en',
  'ggml-small',
  'ggml-small.en',
  'ggml-medium',
  'ggml-medium.en',
  'ggml-large-v3',
  'ggml-large-v3-turbo',
  'ggml-large-v3-turbo-q5_0',
  'ggml-large-v3-turbo-q8_0',
]);
export type WhisperModelId = z.infer<typeof WhisperModelId>;

export const WhisperModelInfo = z.object({
  id: WhisperModelId,
  label: z.string(),
  sizeMB: z.number(),
  downloaded: z.boolean(),
  filePath: FilePath.optional(),
});
export type WhisperModelInfo = z.infer<typeof WhisperModelInfo>;

/**
 * stt:whisper:models — list available and downloaded models
 */
export const WhisperModelsRequest = z.object({});
export type WhisperModelsRequest = z.infer<typeof WhisperModelsRequest>;

export const WhisperModelsResponse = z.object({
  models: z.array(WhisperModelInfo),
  binaryReady: z.boolean(),
});
export type WhisperModelsResponse = z.infer<typeof WhisperModelsResponse>;

/**
 * stt:whisper:download — download a whisper model (or binary)
 */
export const WhisperDownloadRequest = z.object({
  modelId: WhisperModelId,
  taskId: TaskId.optional(),
});
export type WhisperDownloadRequest = z.infer<typeof WhisperDownloadRequest>;

export const WhisperDownloadResponse = z.object({
  modelId: WhisperModelId,
  filePath: FilePath,
  sizeMB: z.number(),
});
export type WhisperDownloadResponse = z.infer<typeof WhisperDownloadResponse>;

/**
 * stt:whisper:delete — remove a downloaded model
 */
export const WhisperDeleteRequest = z.object({
  modelId: WhisperModelId,
});
export type WhisperDeleteRequest = z.infer<typeof WhisperDeleteRequest>;

export const WhisperDeleteResponse = z.object({
  deleted: z.boolean(),
});

/**
 * stt:whisper:binaryDownload — download whisper.cpp binary
 */
export const WhisperBinaryDownloadRequest = z.object({});
export type WhisperBinaryDownloadRequest = z.infer<typeof WhisperBinaryDownloadRequest>;

export const WhisperBinaryDownloadResponse = z.object({
  binPath: FilePath,
});
export type WhisperBinaryDownloadResponse = z.infer<typeof WhisperBinaryDownloadResponse>;
