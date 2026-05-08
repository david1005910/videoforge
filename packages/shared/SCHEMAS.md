# Shared Package — IPC Schema Reference

> 모든 IPC 채널과 zod 스키마의 매핑.
> 새 채널 추가 시 이 표 + `specify.md` §0 매핑 표를 함께 갱신.

## 사용법

```ts
// 메인 측 (electron/main/services/...)
import { Channels, TtsSchemas } from '@videoforge/shared';
import { registerHandler } from '../ipc-router';

registerHandler(
  Channels.Tts.Edge,
  TtsSchemas.TtsEdgeRequest,    // 자동 검증
  async (req) => {              // req는 z.infer로 타입 추론됨
    return ttsEdge(req);
  },
);

// 렌더러 측 (src/lib/api.ts)
import { TtsSchemas, type TtsEdgeRequest } from '@videoforge/shared';

export async function ttsEdge(req: TtsEdgeRequest) {
  const resp = await window.electronAPI.tts.edge(req);
  if (!resp.ok) throw new Error(resp.error.message);
  return TtsSchemas.TtsResult.parse(resp.data);
}
```

## 채널 ↔ 스키마 매핑

| IPC Channel | Request Schema | Response Schema | Phase |
|---|---|---|---|
| `app:ping` | `AppSchemas.PingRequest` | `AppSchemas.PingResponse` | 0 |
| `app:getVersion` | — | `AppSchemas.VersionResponse` | 0 |
| `project:save` | `ProjectSchemas.ProjectSaveRequest` | `ProjectSchemas.ProjectSaveResponse` | 1 |
| `project:load` | `ProjectSchemas.ProjectLoadRequest` | `ProjectSchemas.ProjectLoadResponse` | 1 |
| `project:list` | `ProjectSchemas.ProjectListRequest` | `ProjectSchemas.ProjectListResponse` | 1 |
| `project:delete` | `ProjectSchemas.ProjectDeleteRequest` | `ProjectSchemas.ProjectDeleteResponse` | 1 |
| `window:openNew` | `UtilitySchemas.WindowOpenNewRequest` | — | 1 |
| `window:count` | — | `UtilitySchemas.WindowCountResponse` | 1 |
| `system:getHWID` | — | `UtilitySchemas.SystemGetHwidResponse` | 3 |
| `system:getFfmpegPath` | — | `UtilitySchemas.SystemGetFfmpegPathResponse` | 0 |
| `dialog:selectFolder` | `UtilitySchemas.DialogSelectFolderRequest` | `UtilitySchemas.DialogSelectFolderResponse` | 1 |
| `dialog:alert` | `UtilitySchemas.DialogAlertRequest` | — | 0 |
| `dialog:confirm` | `UtilitySchemas.DialogConfirmRequest` | `UtilitySchemas.DialogConfirmResponse` | 0 |
| `shell:openExternal` | `UtilitySchemas.ShellOpenExternalRequest` | — | 0 |
| `clipboard:write` | `UtilitySchemas.ClipboardWriteRequest` | — | 1 |
| `clipboard:writeSync` | `UtilitySchemas.ClipboardWriteRequest` | — | 1 |
| `file:saveToDisk` | `UtilitySchemas.FileSaveToDiskRequest` | `UtilitySchemas.FileSaveToDiskResponse` | 1 |
| `file:readBase64` | `UtilitySchemas.FileReadBase64Request` | `UtilitySchemas.FileReadBase64Response` | 1 |
| `file:downloadLocal` | `UtilitySchemas.FileDownloadLocalRequest` | `UtilitySchemas.FileDownloadLocalResponse` | 1 |
| `file:downloadImage` | `UtilitySchemas.FileDownloadImageRequest` | `UtilitySchemas.FileDownloadImageResponse` | 1 |
| `file:downloadImageToFolder` | `UtilitySchemas.FileDownloadImageToFolderRequest` | `UtilitySchemas.FileDownloadImageResponse` | 1 |
| `file:saveImage` | `UtilitySchemas.FileSaveImageRequest` | `UtilitySchemas.FileSaveImageResponse` | 1 |
| `file:saveImageTemp` | `UtilitySchemas.FileSaveTempRequest` | `UtilitySchemas.FileSaveTempResponse` | 1 |
| `file:saveBlobTemp` | `UtilitySchemas.FileSaveTempRequest` | `UtilitySchemas.FileSaveTempResponse` | 1 |
| `tts:edge` | `TtsSchemas.TtsEdgeRequest` | `TtsSchemas.TtsResult` | 2 |
| `tts:google` | `TtsSchemas.TtsGoogleRequest` | `TtsSchemas.TtsResult` | 2 |
| `tts:gemini` | `TtsSchemas.TtsGeminiRequest` | `TtsSchemas.TtsResult` | 2 |
| `tts:onProgress` | (event) | `TtsSchemas.TtsProgressEvent` | 2 |
| `stt:transcribe` | `SttSchemas.SttTranscribeRequest` | `SttSchemas.SttTranscribeResponse` | 3 |
| `stt:align` | `SttSchemas.SttAlignRequest` | `SttSchemas.SttAlignResponse` | 3 |
| `stt:getToken` | `SttSchemas.SttGetTokenRequest` | `SttSchemas.SttGetTokenResponse` | 3 |
| `stt:onProgress` | (event) | `SttSchemas.SttProgressEvent` | 3 |
| `audio:merge` | `AudioSchemas.AudioMergeRequest` | `AudioSchemas.AudioMergeResponse` | 4 |
| `audio:mergeMulti` | `AudioSchemas.AudioMergeMultiRequest` | `AudioSchemas.AudioMergeMultiResponse` | 4 |
| `audio:saveExternal` | `AudioSchemas.AudioSaveExternalRequest` | `AudioSchemas.AudioSaveExternalResponse` | 4 |
| `audio:saveBlob` | `AudioSchemas.AudioSaveBlobRequest` | `AudioSchemas.AudioSaveBlobResponse` | 4 |
| `video:saveTo` | `VideoSchemas.VideoSaveToRequest` | `VideoSchemas.VideoSaveToResponse` | 4 |
| `video:edit` | `VideoSchemas.VideoEditRequest` | `VideoSchemas.VideoEditResponse` | 4 |
| `video:cancel` | `VideoSchemas.VideoCancelRequest` | — | 4 |
| `video:onProgress` | (event) | `VideoSchemas.VideoProgressEvent` | 4 |
| `video:applyEffect` | `VideoSchemas.VideoApplyEffectRequest` | `VideoSchemas.VideoApplyEffectResponse` | 4 |
| `video:saveEffect` | `VideoSchemas.VideoSaveEffectRequest` | — | 4 |
| `video:frames:extract` | `VideoSchemas.VideoFramesExtractRequest` | `VideoSchemas.VideoFramesExtractResponse` | 4 |
| `video:frames:last` | `VideoSchemas.VideoFramesLastRequest` | `VideoSchemas.VideoFramesLastResponse` | 4 |
| `video:subtitleScreenshot` | `VideoSchemas.VideoSubtitleScreenshotRequest` | `VideoSchemas.VideoSubtitleScreenshotResponse` | 4 |
| `assets:fonts:list` | — | `AssetsSchemas.FontsListResponse` | 5 |
| `assets:fonts:upload` | — | `AssetsSchemas.FontsUploadResponse` | 5 |
| `assets:fonts:delete` | `AssetsSchemas.FontsDeleteRequest` | — | 5 |
| `assets:sfx:list` | `AssetsSchemas.SfxListRequest` | `AssetsSchemas.SfxListResponse` | 5 |
| `assets:sfx:upload` | — | `AssetsSchemas.SfxUploadResponse` | 5 |
| `assets:sfx:delete` | `AssetsSchemas.SfxDeleteRequest` | — | 5 |
| `grok:login` | — | `GrokSchemas.GrokLoginResponse` | 6 |
| `grok:generate` | `GrokSchemas.GrokGenerateRequest` | `GrokSchemas.GrokGenerateResponse` | 6 |
| `grok:batch` | `GrokSchemas.GrokBatchRequest` | `GrokSchemas.GrokBatchResponse` | 6 |
| `grok:cancel` | `GrokSchemas.GrokCancelRequest` | — | 6 |
| `grok:close` | — | — | 6 |
| `grok:status` | — | `GrokSchemas.GrokStatusResponse` | 6 |
| `grok:onProgress` | (event) | `GrokSchemas.GrokProgressEvent` | 6 |
| `grok:onVideoReady` | (event) | `GrokSchemas.GrokVideoReadyEvent` | 6 |
| `grok:bridge:status` | — | `GrokSchemas.GrokBridgeStatusResponse` | 12+ |
| `grok:bridge:send` | `GrokSchemas.GrokBridgeSendRequest` | — | 12+ |
| `grok:bridge:cancel` | — | — | 12+ |
| `grok:bridge:setProject` | `GrokSchemas.GrokBridgeSetProjectRequest` | — | 12+ |
| `whisk:uploadRef` | `ImagegenSchemas.WhiskUploadRefRequest` | `ImagegenSchemas.WhiskUploadRefResponse` | 7 |
| `whisk:generate` | `ImagegenSchemas.WhiskGenerateRequest` | `ImagegenSchemas.WhiskGenerateResponse` | 7 |
| `imagefx:login` | — | `ImagegenSchemas.ImagefxLoginResponse` | 7 |
| `imagefx:generate` | `ImagegenSchemas.ImagefxGenerateRequest` | `ImagegenSchemas.ImagefxGenerateResponse` | 7 |
| `imagefx:close` | — | — | 7 |
| `chat:cs` | `ChatRemoteSchemas.ChatCsRequest` | `ChatRemoteSchemas.ChatCsResponse` | 8 |
| `chat:csClear` | — | — | 8 |
| `chat:dna` | `ChatRemoteSchemas.ChatDnaRequest` | `ChatRemoteSchemas.ChatDnaResponse` | 8 |
| `chat:dnaClear` | — | — | 8 |
| `chat:thumbnail` | `ChatRemoteSchemas.ChatThumbnailRequest` | `ChatRemoteSchemas.ChatThumbnailResponse` | 8 |
| `update:on` | (event) | `ChatRemoteSchemas.UpdateStatusEvent` | 10 |
| `update:download` | — | — | 10 |
| `update:install` | — | — | 10 |
| `update:status` | — | `ChatRemoteSchemas.UpdateStatusResponse` | 10 |
| `update:recheck` | — | — | 10 |
| `page:find` | `UtilitySchemas.PageFindRequest` | — | 1 |
| `page:stopFind` | — | — | 1 |
| `page:onFound` | (event) | `UtilitySchemas.PageFoundEvent` | 1 |
| `drag:start` | `UtilitySchemas.DragStartRequest` | — | 1 |
| `remote:init` | `ChatRemoteSchemas.RemoteInitRequest` | `ChatRemoteSchemas.RemoteInitResponse` | 12+ |
| `remote:onGetScenes` | (event) | — | 12+ |
| `remote:sendScenes` | `ChatRemoteSchemas.RemoteScenesResponse` | — | 12+ |
| `remote:onCommand` | (event) | — | 12+ |
| `remote:sendResponse` | (any) | — | 12+ |

총 **약 70개 채널**, **56개 unique zod 스키마**.

## 빈 페이로드 패턴

요청 페이로드가 없는 채널 (예: `grok:login`, `imagefx:close`)은 `Empty` 스키마 (또는 부분 스키마) 사용:

```ts
import { Empty } from '@videoforge/shared';

registerHandler(Channels.Imagefx.Close, Empty, async () => {
  await imagefxClose();
  return undefined;
});
```

## 이벤트 (메인 → 렌더러)

`OnProgress`, `OnVideoReady` 등 이벤트는 ipcMain.handle이 아니라 `webContents.send`. 페이로드 검증은 발신 측에서 zod로:

```ts
import { GrokSchemas } from '@videoforge/shared';

const event = GrokSchemas.GrokProgressEvent.parse({ taskId, percent, phase });
broadcast(Channels.Grok.OnProgress, event);
```
