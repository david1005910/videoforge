/**
 * @videoforge/shared — 메인↔렌더러 공유 타입 + 스키마.
 *
 * 모든 IPC 채널 페이로드는 이 패키지의 zod 스키마로 검증된다.
 * 신규 채널 추가 시:
 *   1. ipc-channels.ts 에 채널명 추가
 *   2. schemas/<도메인>.ts 에 zod 스키마 추가
 *   3. specify.md 매핑 표 갱신
 */

export * from './ipc-channels';

// 도메인 모델
export * from './domain/project';

// 공통 빌딩 블록
export * from './schemas/common';

// 도메인별 스키마 — 네임스페이스로 export 하여 충돌 방지
export * as AppSchemas from './schemas/app';
export * as ProjectSchemas from './schemas/project';
export * as TtsSchemas from './schemas/tts';
export * as SttSchemas from './schemas/stt';
export * as VideoSchemas from './schemas/video';
export * as AudioSchemas from './schemas/audio';
export * as UtilitySchemas from './schemas/utility';
export * as AssetsSchemas from './schemas/assets';
export * as GrokSchemas from './schemas/grok';
export * as ImagegenSchemas from './schemas/imagegen';
export * as ChatRemoteSchemas from './schemas/chat-and-remote';

// 자주 쓰는 타입은 직접 re-export (편의용)
export type { PingRequest, PingResponse, VersionResponse } from './schemas/app';
export type {
  ProjectSaveRequest,
  ProjectLoadRequest,
  ProjectListRequest,
  ProjectListResponse,
} from './schemas/project';
export type {
  TtsEdgeRequest,
  TtsGoogleRequest,
  TtsGeminiRequest,
  TtsResult,
  TtsProgressEvent,
  TtsVoice,
} from './schemas/tts';
export type {
  SttTranscribeRequest,
  SttTranscribeResponse,
  SttAlignRequest,
  SttAlignResponse,
  SttSegment,
  AlignedWord,
  SttProgressEvent,
} from './schemas/stt';
export type {
  PipelineStep,
  VideoEditRequest,
  VideoEditResponse,
  VideoProgressEvent,
} from './schemas/video';
export type {
  AudioMergeRequest,
  AudioMergeMultiRequest,
  AudioTrackSpec,
} from './schemas/audio';
export type {
  GrokTask,
  GrokGenerateRequest,
  GrokBatchRequest,
  GrokVideoReadyEvent,
  GrokProgressEvent,
} from './schemas/grok';
export type {
  WhiskGenerateRequest,
  WhiskGenerateResponse,
  ImagefxGenerateRequest,
  ImagefxGenerateResponse,
} from './schemas/imagegen';
export type {
  ChatMessage,
  ChatCsRequest,
  ChatDnaRequest,
  ChatThumbnailRequest,
  ChatThumbnailResponse,
  DnaScriptScene,
  UpdateStatusEvent,
} from './schemas/chat-and-remote';
