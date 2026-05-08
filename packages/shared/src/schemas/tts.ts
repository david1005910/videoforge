import { z } from 'zod';
import { FilePath, TaskId, ProgressEvent } from './common';

/**
 * 공통 TTS 요청 페이로드.
 * provider별 추가 필드는 각각의 스키마에서 확장.
 */
const TtsBaseRequest = z.object({
  text: z.string().min(1).max(50_000),
  voice: z.string().min(1).max(100),
  speed: z.number().min(0.5).max(2).default(1),
  pitch: z.number().min(-20).max(20).default(0),
  /** 미지정 시 임시 폴더에 sha1 기반 경로로 저장 */
  outputPath: FilePath.optional(),
  /** 진행률 추적용. 미지정 시 자동 생성 */
  taskId: TaskId.optional(),
});

export const TtsResult = z.object({
  audioPath: FilePath,
  durationMs: z.number().nonnegative(),
  /** 캐시 적중 여부 */
  cached: z.boolean(),
});
export type TtsResult = z.infer<typeof TtsResult>;

/**
 * tts:edge — Microsoft Edge TTS (무료, 다국어)
 */
export const TtsEdgeRequest = TtsBaseRequest;
export type TtsEdgeRequest = z.infer<typeof TtsEdgeRequest>;
export const TtsEdgeResponse = TtsResult;
export type TtsEdgeResponse = z.infer<typeof TtsEdgeResponse>;

/**
 * tts:google — Google Cloud TTS (WaveNet/Studio)
 */
export const TtsGoogleRequest = TtsBaseRequest.extend({
  apiKey: z.string().min(20).optional(), // 미지정 시 Keychain에서 로드
  voiceProfile: z.enum(['standard', 'wavenet', 'neural2', 'studio']).default('wavenet'),
});
export type TtsGoogleRequest = z.infer<typeof TtsGoogleRequest>;
export const TtsGoogleResponse = TtsResult;
export type TtsGoogleResponse = z.infer<typeof TtsGoogleResponse>;

/**
 * tts:gemini — Gemini TTS (감정 표현)
 */
export const TtsGeminiRequest = TtsBaseRequest.extend({
  apiKey: z.string().min(20).optional(),
  /** 감정 톤 힌트 (예: "차분하게", "흥분되게") */
  emotion: z.string().max(200).optional(),
  /** 다중 화자 지원 */
  speaker: z.string().max(100).optional(),
});
export type TtsGeminiRequest = z.infer<typeof TtsGeminiRequest>;
export const TtsGeminiResponse = TtsResult;
export type TtsGeminiResponse = z.infer<typeof TtsGeminiResponse>;

/**
 * tts:onProgress (메인 → 렌더러 이벤트)
 */
export const TtsProgressEvent = ProgressEvent.extend({
  provider: z.enum(['edge', 'google', 'gemini']),
});
export type TtsProgressEvent = z.infer<typeof TtsProgressEvent>;

/**
 * 공용 보이스 카탈로그 항목 (UI 표시용)
 */
export const TtsVoice = z.object({
  id: z.string(),
  provider: z.enum(['edge', 'google', 'gemini']),
  language: z.string(),
  gender: z.enum(['male', 'female', 'neutral']).optional(),
  displayName: z.string(),
  /** 샘플 미리듣기 텍스트 */
  sample: z.string().optional(),
});
export type TtsVoice = z.infer<typeof TtsVoice>;
