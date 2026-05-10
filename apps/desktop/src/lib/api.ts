import {
  AppSchemas,
  ProjectSchemas,
  TtsSchemas,
  SttSchemas,
  VideoSchemas,
  AudioSchemas,
  AssetsSchemas,
  GrokSchemas,
  ImagegenSchemas,
  ChatRemoteSchemas,
  UtilitySchemas,
  type IpcResponse,
  type PingRequest,
  type PingResponse,
  type VersionResponse,
  type ProjectSaveRequest,
  type ProjectSaveResponse,
  type ProjectListRequest,
  type ProjectListResponse,
  type ProjectDeleteRequest,
  type ProjectDeleteResponse,
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
  type VideoEditRequest,
  type VideoEditResponse,
  type AudioMergeRequest,
  type AudioMergeMultiRequest,
  type FontsListResponse,
  type FontsUploadResponse,
  type FontsDeleteRequest,
  type SfxListRequest,
  type SfxListResponse,
  type SfxUploadResponse,
  type SfxDeleteRequest,
  type GrokGenerateRequest,
  type GrokGenerateResponse,
  type GrokBatchRequest,
  type GrokBatchResponse,
  type GrokCancelRequest,
  type GrokLoginResponse,
  type GrokStatusResponse,
  type GrokBridgeStatusResponse,
  type GrokBridgeSendRequest,
  type GrokBridgeSetProjectRequest,
  type WhiskUploadRefRequest,
  type WhiskUploadRefResponse,
  type WhiskGenerateRequest,
  type WhiskGenerateResponse,
  type ImagefxLoginResponse,
  type ImagefxGenerateRequest,
  type ImagefxGenerateResponse,
  type ChatCsRequest,
  type ChatCsResponse,
  type ChatDnaRequest,
  type ChatDnaResponse,
  type ChatThumbnailRequest,
  type ChatThumbnailResponse,
  type UpdateStatusResponse,
  type RemoteInitRequest,
  type RemoteInitResponse,
  type RemoteScenesResponse,
} from '@videoforge/shared';
import { Project } from '@videoforge/shared';

/**
 * IpcResponse 봉투에서 데이터를 꺼내거나 throw.
 * Renderer 코드는 이 함수 거쳐서만 IPC 결과를 사용.
 */
interface IpcError extends Error {
  code: string;
  hint: string | undefined;
}

function unwrap<T>(resp: IpcResponse<T>): T {
  if (resp.ok) return resp.data;
  const err = new Error(resp.error.message) as IpcError;
  err.code = resp.error.code;
  err.hint = resp.error.hint;
  throw err;
}

export const api = {
  app: {
    async ping(req: PingRequest): Promise<PingResponse> {
      const resp = await window.electronAPI.app.ping(req);
      return AppSchemas.PingResponse.parse(unwrap(resp));
    },
    async getVersion(): Promise<VersionResponse> {
      const resp = await window.electronAPI.app.getVersion();
      return AppSchemas.VersionResponse.parse(unwrap(resp));
    },
  },

  project: {
    async save(req: ProjectSaveRequest): Promise<ProjectSaveResponse> {
      const resp = await window.electronAPI.project.save(req);
      return ProjectSchemas.ProjectSaveResponse.parse(unwrap(resp));
    },
    async load(id: string): Promise<ReturnType<typeof Project.parse>> {
      const resp = await window.electronAPI.project.load({ id });
      return Project.parse(unwrap(resp));
    },
    async list(req?: Partial<ProjectListRequest>): Promise<ProjectListResponse> {
      const resp = await window.electronAPI.project.list(req);
      return ProjectSchemas.ProjectListResponse.parse(unwrap(resp));
    },
    async delete(req: ProjectDeleteRequest): Promise<ProjectDeleteResponse> {
      const resp = await window.electronAPI.project.delete(req);
      return ProjectSchemas.ProjectDeleteResponse.parse(unwrap(resp));
    },
  },

  dialog: {
    async selectFolder(title?: string, defaultPath?: string) {
      const resp = await window.electronAPI.dialog.selectFolder({ title, defaultPath });
      return UtilitySchemas.DialogSelectFolderResponse.parse(unwrap(resp));
    },
    async alert(title: string, message: string, level: 'info' | 'warning' | 'error' = 'info') {
      const resp = await window.electronAPI.dialog.alert({ title, message, level });
      unwrap(resp);
    },
    async confirm(title: string, message: string, opts?: { destructive?: boolean }) {
      const resp = await window.electronAPI.dialog.confirm({
        title,
        message,
        destructive: opts?.destructive,
      });
      return UtilitySchemas.DialogConfirmResponse.parse(unwrap(resp));
    },
  },

  file: {
    async readBase64(filePath: string) {
      const resp = await window.electronAPI.file.readBase64({ path: filePath });
      return UtilitySchemas.FileReadBase64Response.parse(unwrap(resp));
    },
    async saveToDisk(base64Data: string, defaultFilename: string) {
      const resp = await window.electronAPI.file.saveToDisk({ base64Data, defaultFilename });
      return UtilitySchemas.FileSaveToDiskResponse.parse(unwrap(resp));
    },
  },

  shell: {
    async openExternal(url: string) {
      const resp = await window.electronAPI.shell.openExternal({ url });
      unwrap(resp);
    },
  },

  clipboard: {
    async write(text: string) {
      const resp = await window.electronAPI.clipboard.write({ text });
      unwrap(resp);
    },
  },

  window: {
    async openNew(initialRoute?: string) {
      const resp = await window.electronAPI.window.openNew({ initialRoute });
      return UtilitySchemas.WindowCountResponse.parse(unwrap(resp));
    },
    async count() {
      const resp = await window.electronAPI.window.count();
      return UtilitySchemas.WindowCountResponse.parse(unwrap(resp));
    },
  },

  keychain: {
    async get(key: string): Promise<string | null> {
      const resp = await window.electronAPI.keychain.get({ key });
      const data = UtilitySchemas.KeychainGetResponse.parse(unwrap(resp));
      return data.value;
    },
    async set(key: string, value: string): Promise<void> {
      const resp = await window.electronAPI.keychain.set({ key, value });
      unwrap(resp);
    },
    async delete(key: string): Promise<void> {
      const resp = await window.electronAPI.keychain.delete({ key });
      unwrap(resp);
    },
  },

  video: {
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
  },

  audio: {
    async merge(req: AudioMergeRequest) {
      const resp = await window.electronAPI.audio.merge(req);
      return AudioSchemas.AudioMergeResponse.parse(unwrap(resp));
    },
    async mergeMulti(req: AudioMergeMultiRequest) {
      const resp = await window.electronAPI.audio.mergeMulti(req);
      return AudioSchemas.AudioMergeMultiResponse.parse(unwrap(resp));
    },
  },

  stt: {
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
  },

  assets: {
    async fontsList(): Promise<FontsListResponse> {
      const resp = await window.electronAPI.assets.fontsList();
      return AssetsSchemas.FontsListResponse.parse(unwrap(resp));
    },
    async fontsUpload(): Promise<FontsUploadResponse> {
      const resp = await window.electronAPI.assets.fontsUpload();
      return AssetsSchemas.FontsUploadResponse.parse(unwrap(resp));
    },
    async fontsDelete(req: FontsDeleteRequest): Promise<void> {
      const resp = await window.electronAPI.assets.fontsDelete(req);
      unwrap(resp);
    },
    async sfxList(req?: SfxListRequest): Promise<SfxListResponse> {
      const resp = await window.electronAPI.assets.sfxList(req);
      return AssetsSchemas.SfxListResponse.parse(unwrap(resp));
    },
    async sfxUpload(): Promise<SfxUploadResponse> {
      const resp = await window.electronAPI.assets.sfxUpload();
      return AssetsSchemas.SfxUploadResponse.parse(unwrap(resp));
    },
    async sfxDelete(req: SfxDeleteRequest): Promise<void> {
      const resp = await window.electronAPI.assets.sfxDelete(req);
      unwrap(resp);
    },
  },

  grok: {
    async login(): Promise<GrokLoginResponse> {
      const resp = await window.electronAPI.grok.login();
      return GrokSchemas.GrokLoginResponse.parse(unwrap(resp));
    },
    async generate(req: GrokGenerateRequest): Promise<GrokGenerateResponse> {
      const resp = await window.electronAPI.grok.generate(req);
      return GrokSchemas.GrokGenerateResponse.parse(unwrap(resp));
    },
    async batch(req: GrokBatchRequest): Promise<GrokBatchResponse> {
      const resp = await window.electronAPI.grok.batch(req);
      return GrokSchemas.GrokBatchResponse.parse(unwrap(resp));
    },
    async cancel(req: GrokCancelRequest): Promise<void> {
      const resp = await window.electronAPI.grok.cancel(req);
      unwrap(resp);
    },
    async close(): Promise<void> {
      const resp = await window.electronAPI.grok.close();
      unwrap(resp);
    },
    async status(): Promise<GrokStatusResponse> {
      const resp = await window.electronAPI.grok.status();
      return GrokSchemas.GrokStatusResponse.parse(unwrap(resp));
    },
    async bridgeStatus(): Promise<GrokBridgeStatusResponse> {
      const resp = await window.electronAPI.grok.bridgeStatus();
      return GrokSchemas.GrokBridgeStatusResponse.parse(unwrap(resp));
    },
    async bridgeSend(req: GrokBridgeSendRequest): Promise<void> {
      const resp = await window.electronAPI.grok.bridgeSend(req);
      unwrap(resp);
    },
    async bridgeCancel(): Promise<void> {
      const resp = await window.electronAPI.grok.bridgeCancel();
      unwrap(resp);
    },
    async bridgeSetProject(req: GrokBridgeSetProjectRequest): Promise<void> {
      const resp = await window.electronAPI.grok.bridgeSetProject(req);
      unwrap(resp);
    },
    onProgress(cb: (payload: unknown) => void): () => void {
      return window.electronAPI.grok.onProgress(cb);
    },
    onVideoReady(cb: (payload: unknown) => void): () => void {
      return window.electronAPI.grok.onVideoReady(cb);
    },
  },

  whisk: {
    async uploadRef(req: WhiskUploadRefRequest): Promise<WhiskUploadRefResponse> {
      const resp = await window.electronAPI.whisk.uploadRef(req);
      return ImagegenSchemas.WhiskUploadRefResponse.parse(unwrap(resp));
    },
    async generate(req: WhiskGenerateRequest): Promise<WhiskGenerateResponse> {
      const resp = await window.electronAPI.whisk.generate(req);
      return ImagegenSchemas.WhiskGenerateResponse.parse(unwrap(resp));
    },
  },

  imagefx: {
    async login(): Promise<ImagefxLoginResponse> {
      const resp = await window.electronAPI.imagefx.login();
      return ImagegenSchemas.ImagefxLoginResponse.parse(unwrap(resp));
    },
    async generate(req: ImagefxGenerateRequest): Promise<ImagefxGenerateResponse> {
      const resp = await window.electronAPI.imagefx.generate(req);
      return ImagegenSchemas.ImagefxGenerateResponse.parse(unwrap(resp));
    },
    async close(): Promise<void> {
      const resp = await window.electronAPI.imagefx.close();
      unwrap(resp);
    },
  },

  chat: {
    async cs(req: ChatCsRequest): Promise<ChatCsResponse> {
      const resp = await window.electronAPI.chat.cs(req);
      return ChatRemoteSchemas.ChatCsResponse.parse(unwrap(resp));
    },
    async csClear(): Promise<void> {
      const resp = await window.electronAPI.chat.csClear();
      unwrap(resp);
    },
    async dna(req: ChatDnaRequest): Promise<ChatDnaResponse> {
      const resp = await window.electronAPI.chat.dna(req);
      return ChatRemoteSchemas.ChatDnaResponse.parse(unwrap(resp));
    },
    async dnaClear(): Promise<void> {
      const resp = await window.electronAPI.chat.dnaClear();
      unwrap(resp);
    },
    async thumbnail(req: ChatThumbnailRequest): Promise<ChatThumbnailResponse> {
      const resp = await window.electronAPI.chat.thumbnail(req);
      return ChatRemoteSchemas.ChatThumbnailResponse.parse(unwrap(resp));
    },
    async historyLoad(projectId: string, mode: string) {
      const resp = await window.electronAPI.chat.historyLoad({ projectId, mode });
      return unwrap(resp) as { messages: { role: string; content: string }[] };
    },
    async historySave(
      projectId: string,
      mode: string,
      messages: { role: string; content: string }[],
    ) {
      const resp = await window.electronAPI.chat.historySave({ projectId, mode, messages });
      unwrap(resp);
    },
    async historyClear(projectId: string, mode: string) {
      const resp = await window.electronAPI.chat.historyClear({ projectId, mode });
      unwrap(resp);
    },
  },

  diagnostics: {
    async errorReport(outputDir: string): Promise<{ reportPath: string }> {
      const resp = await window.electronAPI.diagnostics.errorReport({ outputDir });
      return unwrap(resp) as { reportPath: string };
    },
  },

  update: {
    async status(): Promise<UpdateStatusResponse> {
      const resp = await window.electronAPI.update.status();
      return ChatRemoteSchemas.UpdateStatusResponse.parse(unwrap(resp));
    },
    async recheck(): Promise<UpdateStatusResponse> {
      const resp = await window.electronAPI.update.recheck();
      return ChatRemoteSchemas.UpdateStatusResponse.parse(unwrap(resp));
    },
    async download(): Promise<void> {
      const resp = await window.electronAPI.update.download();
      unwrap(resp);
    },
    async install(): Promise<void> {
      const resp = await window.electronAPI.update.install();
      unwrap(resp);
    },
    onStatus(cb: (payload: unknown) => void): () => void {
      return window.electronAPI.update.onStatus(cb);
    },
  },

  remote: {
    async init(req: RemoteInitRequest): Promise<RemoteInitResponse> {
      const resp = await window.electronAPI.remote.init(req);
      return ChatRemoteSchemas.RemoteInitResponse.parse(unwrap(resp));
    },
    async sendScenes(req: RemoteScenesResponse): Promise<void> {
      const resp = await window.electronAPI.remote.sendScenes(req);
      unwrap(resp);
    },
    async sendResponse(payload: unknown): Promise<void> {
      const resp = await window.electronAPI.remote.sendResponse({ payload });
      unwrap(resp);
    },
    onGetScenes(cb: (payload: unknown) => void): () => void {
      return window.electronAPI.remote.onGetScenes(cb);
    },
    onCommand(cb: (payload: unknown) => void): () => void {
      return window.electronAPI.remote.onCommand(cb);
    },
  },

  tts: {
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
  },
};
