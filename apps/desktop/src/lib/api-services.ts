import {
  AssetsSchemas,
  GrokSchemas,
  ImagegenSchemas,
  ChatRemoteSchemas,
  CloudSyncSchemas,
  VideogenSchemas,
  CollabSchemas,
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
  type GrokApiGenerateRequest,
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
  type CloudConnectRequest,
  type CloudConnectResponse,
  type CloudStatusResponse,
  type CloudSyncRequest,
  type CloudSyncResponse,
  type CloudListRemoteResponse,
  type VideogenGenerateRequest,
  type VideogenGenerateResponse,
  type VideogenStatusResponse,
  type VideogenCancelRequest,
  type CollabPublishRequest,
  type CollabPublishResponse,
  type CollabBrowseRequest,
  type CollabBrowseResponse,
  type CollabDownloadRequest,
  type CollabDownloadResponse,
  type CollabDeleteRequest,
} from '@videoforge/shared';
import { unwrap } from './api-utils';

export const assetsApi = {
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
};

export const grokApi = {
  async login(): Promise<GrokLoginResponse> {
    const resp = await window.electronAPI.grok.login();
    return GrokSchemas.GrokLoginResponse.parse(unwrap(resp));
  },
  async generate(req: GrokGenerateRequest): Promise<GrokGenerateResponse> {
    const resp = await window.electronAPI.grok.generate(req);
    return GrokSchemas.GrokGenerateResponse.parse(unwrap(resp));
  },
  async apiGenerate(req: GrokApiGenerateRequest): Promise<GrokGenerateResponse> {
    const resp = await window.electronAPI.grok.apiGenerate(req);
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
  async openWithExtension(target?: string): Promise<{ ok: boolean; message: string }> {
    const resp = await window.electronAPI.grok.openWithExtension(target ? { target } : {});
    return unwrap(resp) as { ok: boolean; message: string };
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
};

export const whiskApi = {
  async uploadRef(req: WhiskUploadRefRequest): Promise<WhiskUploadRefResponse> {
    const resp = await window.electronAPI.whisk.uploadRef(req);
    return ImagegenSchemas.WhiskUploadRefResponse.parse(unwrap(resp));
  },
  async generate(req: WhiskGenerateRequest): Promise<WhiskGenerateResponse> {
    const resp = await window.electronAPI.whisk.generate(req);
    return ImagegenSchemas.WhiskGenerateResponse.parse(unwrap(resp));
  },
};

export const imagefxApi = {
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
};

export const chatApi = {
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
};

export const updateApi = {
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
};

export const cloudApi = {
  async connect(req: CloudConnectRequest): Promise<CloudConnectResponse> {
    const resp = await window.electronAPI.cloud.connect(req);
    return CloudSyncSchemas.CloudConnectResponse.parse(unwrap(resp));
  },
  async disconnect(): Promise<void> {
    const resp = await window.electronAPI.cloud.disconnect();
    unwrap(resp);
  },
  async status(): Promise<CloudStatusResponse> {
    const resp = await window.electronAPI.cloud.status();
    return CloudSyncSchemas.CloudStatusResponse.parse(unwrap(resp));
  },
  async sync(req: CloudSyncRequest): Promise<CloudSyncResponse> {
    const resp = await window.electronAPI.cloud.sync(req);
    return CloudSyncSchemas.CloudSyncResponse.parse(unwrap(resp));
  },
  async listRemote(): Promise<CloudListRemoteResponse> {
    const resp = await window.electronAPI.cloud.listRemote();
    return CloudSyncSchemas.CloudListRemoteResponse.parse(unwrap(resp));
  },
};

export const videogenApi = {
  async generate(req: VideogenGenerateRequest): Promise<VideogenGenerateResponse> {
    const resp = await window.electronAPI.videogen.generate(req);
    return VideogenSchemas.VideogenGenerateResponse.parse(unwrap(resp));
  },
  async cancel(req: VideogenCancelRequest): Promise<void> {
    const resp = await window.electronAPI.videogen.cancel(req);
    unwrap(resp);
  },
  async status(): Promise<VideogenStatusResponse> {
    const resp = await window.electronAPI.videogen.status();
    return VideogenSchemas.VideogenStatusResponse.parse(unwrap(resp));
  },
  onProgress(cb: (payload: unknown) => void): () => void {
    return window.electronAPI.videogen.onProgress(cb);
  },
  onComplete(cb: (payload: unknown) => void): () => void {
    return window.electronAPI.videogen.onComplete(cb);
  },
};

export const collabApi = {
  async publish(req: CollabPublishRequest): Promise<CollabPublishResponse> {
    const resp = await window.electronAPI.collab.publish(req);
    return CollabSchemas.CollabPublishResponse.parse(unwrap(resp));
  },
  async browse(req: CollabBrowseRequest): Promise<CollabBrowseResponse> {
    const resp = await window.electronAPI.collab.browse(req);
    return CollabSchemas.CollabBrowseResponse.parse(unwrap(resp));
  },
  async download(req: CollabDownloadRequest): Promise<CollabDownloadResponse> {
    const resp = await window.electronAPI.collab.download(req);
    return CollabSchemas.CollabDownloadResponse.parse(unwrap(resp));
  },
  async delete(req: CollabDeleteRequest): Promise<void> {
    const resp = await window.electronAPI.collab.delete(req);
    unwrap(resp);
  },
};

export const remoteApi = {
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
};
