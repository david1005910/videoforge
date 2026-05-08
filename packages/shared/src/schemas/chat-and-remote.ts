import { z } from 'zod';
import { FilePath, Ulid } from './common';

/* ========================================================================
 * Chat (Gemini-backed assistants)
 * ======================================================================== */

export const ChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().max(50_000),
  /** 첨부 이미지 (썸네일 분석 등) */
  imagePaths: z.array(FilePath).optional(),
  timestamp: z.string().datetime().optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

/**
 * chat:cs — 일반 도움 챗
 */
export const ChatCsRequest = z.object({
  messages: z.array(ChatMessage).min(1),
  apiKey: z.string().optional(),
});
export type ChatCsRequest = z.infer<typeof ChatCsRequest>;

export const ChatCsResponse = z.object({
  reply: z.string(),
  /** 응답 생성에 사용된 토큰 수 */
  tokensUsed: z.number().int().nonnegative().optional(),
});
export type ChatCsResponse = z.infer<typeof ChatCsResponse>;

/**
 * chat:dna — DNA Script (영상 스크립트 생성)
 */
export const ChatDnaRequest = z.object({
  messages: z.array(ChatMessage).min(1),
  /** 프로젝트별 컨텍스트 주입 */
  projectId: Ulid.optional(),
  apiKey: z.string().optional(),
});
export type ChatDnaRequest = z.infer<typeof ChatDnaRequest>;

export const DnaScriptScene = z.object({
  index: z.number().int().nonnegative(),
  scriptKo: z.string(),
  imagePrompt: z.string(),
  videoPrompt: z.string(),
  durationSec: z.number().int().positive().optional(),
});
export type DnaScriptScene = z.infer<typeof DnaScriptScene>;

export const ChatDnaResponse = z.object({
  reply: z.string(),
  /** 구조화된 스크립트 (DNA 챗이 JSON으로 응답한 경우) */
  script: z
    .object({
      title: z.string(),
      scenes: z.array(DnaScriptScene),
    })
    .optional(),
});
export type ChatDnaResponse = z.infer<typeof ChatDnaResponse>;

/**
 * chat:thumbnail — 썸네일 분석
 */
export const ChatThumbnailRequest = z.object({
  imagePath: FilePath,
  title: z.string().min(1).max(200),
  /** 채널 컨텍스트 */
  channelGenre: z.string().optional(),
  apiKey: z.string().optional(),
});
export type ChatThumbnailRequest = z.infer<typeof ChatThumbnailRequest>;

export const ChatThumbnailResponse = z.object({
  /** 클릭 가능성 점수 (0~100) */
  score: z.number().min(0).max(100),
  suggestions: z.array(z.string()),
  /** 강점 */
  strengths: z.array(z.string()),
  /** 약점 */
  weaknesses: z.array(z.string()),
});
export type ChatThumbnailResponse = z.infer<typeof ChatThumbnailResponse>;

/* ========================================================================
 * Update
 * ======================================================================== */

export const UpdateStatus = z.enum([
  'idle',
  'checking',
  'available',
  'downloading',
  'downloaded',
  'error',
  'not-available',
]);
export type UpdateStatus = z.infer<typeof UpdateStatus>;

export const UpdateStatusEvent = z.object({
  status: UpdateStatus,
  version: z.string().optional(),
  releaseNotes: z.string().optional(),
  /** 다운로드 진행률 */
  percent: z.number().min(0).max(100).optional(),
  bytesPerSecond: z.number().int().nonnegative().optional(),
  totalBytes: z.number().int().nonnegative().optional(),
  errorMessage: z.string().optional(),
});
export type UpdateStatusEvent = z.infer<typeof UpdateStatusEvent>;

export const UpdateStatusResponse = UpdateStatusEvent;
export type UpdateStatusResponse = z.infer<typeof UpdateStatusResponse>;

/* ========================================================================
 * Remote (mobile companion bridge — Phase 12+ 자리 예약)
 * ======================================================================== */

export const RemoteInitRequest = z.object({
  /** WebSocket 포트 (0 = 자동) */
  port: z.number().int().min(0).max(65535).default(0),
  /** 페어링 코드 길이 */
  codeLength: z.number().int().min(4).max(12).default(6),
});
export type RemoteInitRequest = z.infer<typeof RemoteInitRequest>;

export const RemoteInitResponse = z.object({
  port: z.number().int().positive(),
  /** 페어링 코드 (사용자가 모바일에 입력) */
  pairingCode: z.string(),
  /** 만료 시각 */
  expiresAt: z.string().datetime(),
});
export type RemoteInitResponse = z.infer<typeof RemoteInitResponse>;

export const RemoteSceneSummary = z.object({
  id: Ulid,
  index: z.number().int().nonnegative(),
  title: z.string(),
  thumbnailBase64: z.string().optional(),
  status: z.enum(['draft', 'generating', 'complete', 'failed']),
});
export type RemoteSceneSummary = z.infer<typeof RemoteSceneSummary>;

export const RemoteScenesResponse = z.object({
  projectId: Ulid,
  scenes: z.array(RemoteSceneSummary),
});
export type RemoteScenesResponse = z.infer<typeof RemoteScenesResponse>;
