import { z } from 'zod';
import { FilePath, TaskId, ProgressEvent, Ulid } from './common';

/**
 * Grok Imagine 영상 생성 task.
 *
 * specify.md §3.5 참조.
 */
export const GrokTask = z.object({
  taskId: TaskId,
  prompt: z.string().min(1).max(2000),
  /** 입력 이미지 (image-to-video) */
  imagePath: FilePath.optional(),
  /** 출력 길이 (초) */
  durationSec: z.number().int().min(1).max(20).default(6),
  /** 한 task당 생성할 영상 개수 */
  count: z.number().int().min(1).max(10).default(1),
  /** 결과 저장 폴더 */
  outputDir: FilePath,
  /** 실패 시 자동 재시도 횟수 */
  maxRetries: z.number().int().min(0).max(5).default(2),
});
export type GrokTask = z.infer<typeof GrokTask>;

/**
 * grok:login
 */
export const GrokLoginResponse = z.object({
  ok: z.boolean(),
  /** 자격증명 저장된 프로파일 경로 */
  profilePath: FilePath,
  /** 로그인된 X 핸들 (확인용) */
  username: z.string().optional(),
});
export type GrokLoginResponse = z.infer<typeof GrokLoginResponse>;

/**
 * grok:generate (단일)
 */
export const GrokGenerateRequest = GrokTask.omit({ taskId: true });
export type GrokGenerateRequest = z.infer<typeof GrokGenerateRequest>;

export const GrokGenerateResponse = z.object({
  taskId: TaskId,
  /** 큐에 등록되었음. 완료는 grok:onVideoReady 이벤트로 통지 */
  queuedAt: z.string().datetime(),
});
export type GrokGenerateResponse = z.infer<typeof GrokGenerateResponse>;

/**
 * grok:batch
 */
export const GrokBatchRequest = z.object({
  items: z.array(GrokTask.omit({ taskId: true })).min(1).max(50),
  outputDir: FilePath,
});
export type GrokBatchRequest = z.infer<typeof GrokBatchRequest>;

export const GrokBatchResponse = z.object({
  batchId: Ulid,
  taskIds: z.array(TaskId),
});
export type GrokBatchResponse = z.infer<typeof GrokBatchResponse>;

/**
 * grok:cancel
 */
export const GrokCancelRequest = z.object({
  /** task 또는 batch */
  taskId: TaskId.optional(),
  batchId: Ulid.optional(),
});
export type GrokCancelRequest = z.infer<typeof GrokCancelRequest>;

/**
 * grok:status / grok:close
 */
export const GrokStatusResponse = z.object({
  loggedIn: z.boolean(),
  browserConnected: z.boolean(),
  queue: z.object({
    pending: z.number().int().nonnegative(),
    running: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
});
export type GrokStatusResponse = z.infer<typeof GrokStatusResponse>;

/**
 * grok:onProgress (메인 → 렌더러)
 */
export const GrokProgressEvent = ProgressEvent.extend({
  phase: z.enum(['queued', 'opening', 'submitting', 'generating', 'downloading', 'complete', 'failed']),
  message: z.string().optional(),
  /** 실패 시 자동 캡처된 스크린샷 경로 */
  failureScreenshotPath: FilePath.optional(),
});
export type GrokProgressEvent = z.infer<typeof GrokProgressEvent>;

/**
 * grok:onVideoReady (메인 → 렌더러)
 */
export const GrokVideoReadyEvent = z.object({
  taskId: TaskId,
  batchId: Ulid.optional(),
  /** 다운로드된 로컬 경로 */
  localPath: FilePath,
  /** 입력 prompt (메타데이터 보존) */
  prompt: z.string(),
  durationMs: z.number().nonnegative(),
  sizeBytes: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});
export type GrokVideoReadyEvent = z.infer<typeof GrokVideoReadyEvent>;

/**
 * grok:bridge:* — Bridge 익스텐션 모드 (Phase 12+)
 */
export const GrokBridgeStatusResponse = z.object({
  available: z.boolean(),
  extensionVersion: z.string().optional(),
  connectedTabs: z.number().int().nonnegative(),
});
export type GrokBridgeStatusResponse = z.infer<typeof GrokBridgeStatusResponse>;

export const GrokBridgeSendRequest = z.object({
  items: z.array(GrokTask.omit({ taskId: true })).min(1),
});
export type GrokBridgeSendRequest = z.infer<typeof GrokBridgeSendRequest>;

export const GrokBridgeSetProjectRequest = z.object({
  projectId: Ulid,
});
export type GrokBridgeSetProjectRequest = z.infer<typeof GrokBridgeSetProjectRequest>;
