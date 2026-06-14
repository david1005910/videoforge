import {
  VideoSchemas,
  AudioSchemas,
  TtsSchemas,
  SttSchemas,
  type VideoEditRequest,
  type VideoEditResponse,
  type AudioMergeRequest,
  type AudioMergeMultiRequest,
  type TtsEdgeRequest,
  type TtsGoogleRequest,
  type TtsGeminiRequest,
  type TtsResult,
  type SttTranscribeRequest,
  type SttTranscribeResponse,
  type SttAlignRequest,
  type SttAlignResponse,
  type WhisperModelsResponse,
  type WhisperDownloadRequest,
  type WhisperDownloadResponse,
  type WhisperDeleteRequest,
  type WhisperBinaryDownloadResponse,
} from '@videoforge/shared';
import { unwrap } from './api-utils';

export const videoApi = {
  async edit(req: VideoEditRequest): Promise<VideoEditResponse> {
    const resp = await window.electronAPI.video.edit(req);
    return VideoSchemas.VideoEditResponse.parse(unwrap(resp));
  },
  async cancel(taskId: string): Promise<void> {
    const resp = await window.electronAPI.video.cancel({ taskId });
    unwrap(resp);
  },
  async saveTo(sourcePath: string, destinationPath?: string) {
    const resp = await window.electronAPI.video.saveTo({ sourcePath, destinationPath });
    return VideoSchemas.VideoSaveToResponse.parse(unwrap(resp));
  },
  async framesExtract(req: unknown) {
    const resp = await window.electronAPI.video.framesExtract(req);
    return VideoSchemas.VideoFramesExtractResponse.parse(unwrap(resp));
  },
  async framesLast(videoPath: string, outputPath?: string) {
    const resp = await window.electronAPI.video.framesLast({ videoPath, outputPath });
    return VideoSchemas.VideoFramesLastResponse.parse(unwrap(resp));
  },
  async subtitleScreenshot(req: unknown) {
    const resp = await window.electronAPI.video.subtitleScreenshot(req);
    return VideoSchemas.VideoSubtitleScreenshotResponse.parse(unwrap(resp));
  },
  onProgress(cb: (payload: unknown) => void): () => void {
    return window.electronAPI.video.onProgress(cb);
  },
};

export const audioApi = {
  async merge(req: AudioMergeRequest) {
    const resp = await window.electronAPI.audio.merge(req);
    return AudioSchemas.AudioMergeResponse.parse(unwrap(resp));
  },
  async mergeMulti(req: AudioMergeMultiRequest) {
    const resp = await window.electronAPI.audio.mergeMulti(req);
    return AudioSchemas.AudioMergeMultiResponse.parse(unwrap(resp));
  },
};

export const sttApi = {
  async transcribe(req: SttTranscribeRequest): Promise<SttTranscribeResponse> {
    const resp = await window.electronAPI.stt.transcribe(req);
    return SttSchemas.SttTranscribeResponse.parse(unwrap(resp));
  },
  async align(req: SttAlignRequest): Promise<SttAlignResponse> {
    const resp = await window.electronAPI.stt.align(req);
    return SttSchemas.SttAlignResponse.parse(unwrap(resp));
  },
  onProgress(cb: (payload: unknown) => void): () => void {
    return window.electronAPI.stt.onProgress(cb);
  },
  async whisperModels(): Promise<WhisperModelsResponse> {
    const resp = await window.electronAPI.stt.whisperModels();
    return SttSchemas.WhisperModelsResponse.parse(unwrap(resp));
  },
  async whisperDownload(req: WhisperDownloadRequest): Promise<WhisperDownloadResponse> {
    const resp = await window.electronAPI.stt.whisperDownload(req);
    return SttSchemas.WhisperDownloadResponse.parse(unwrap(resp));
  },
  async whisperDelete(req: WhisperDeleteRequest): Promise<void> {
    const resp = await window.electronAPI.stt.whisperDelete(req);
    unwrap(resp);
  },
  async whisperBinaryDownload(): Promise<WhisperBinaryDownloadResponse> {
    const resp = await window.electronAPI.stt.whisperBinaryDownload();
    return SttSchemas.WhisperBinaryDownloadResponse.parse(unwrap(resp));
  },
};

export const ttsApi = {
  async edge(req: TtsEdgeRequest): Promise<TtsResult> {
    const resp = await window.electronAPI.tts.edge(req);
    return TtsSchemas.TtsResult.parse(unwrap(resp));
  },
  async google(req: TtsGoogleRequest): Promise<TtsResult> {
    const resp = await window.electronAPI.tts.google(req);
    return TtsSchemas.TtsResult.parse(unwrap(resp));
  },
  async gemini(req: TtsGeminiRequest): Promise<TtsResult> {
    const resp = await window.electronAPI.tts.gemini(req);
    return TtsSchemas.TtsResult.parse(unwrap(resp));
  },
  onProgress(cb: (payload: unknown) => void): () => void {
    return window.electronAPI.tts.onProgress(cb);
  },
};
