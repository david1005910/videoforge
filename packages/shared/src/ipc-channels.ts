/**
 * IPC Channel Names — Single Source of Truth
 *
 * 모든 IPC 채널은 여기에 정의된다.
 * 신규 채널 추가 시 specify.md 매핑 표에도 함께 갱신할 것.
 */

export const Channels = {
  App: {
    Ping: 'app:ping',
    GetVersion: 'app:getVersion',
  },
  Project: {
    Save: 'project:save',
    Load: 'project:load',
    List: 'project:list',
    Delete: 'project:delete',
  },
  Window: {
    OpenNew: 'window:openNew',
    Count: 'window:count',
  },
  System: {
    GetHWID: 'system:getHWID',
    GetFfmpegPath: 'system:getFfmpegPath',
  },
  Dialog: {
    SelectFolder: 'dialog:selectFolder',
    Alert: 'dialog:alert',
    Confirm: 'dialog:confirm',
  },
  Shell: {
    OpenExternal: 'shell:openExternal',
  },
  Clipboard: {
    Write: 'clipboard:write',
    WriteSync: 'clipboard:writeSync',
  },
  File: {
    SaveToDisk: 'file:saveToDisk',
    ReadBase64: 'file:readBase64',
    DownloadLocal: 'file:downloadLocal',
    DownloadImage: 'file:downloadImage',
    DownloadImageToFolder: 'file:downloadImageToFolder',
    SaveImage: 'file:saveImage',
    SaveImageTemp: 'file:saveImageTemp',
    SaveBlobTemp: 'file:saveBlobTemp',
  },
  Tts: {
    Edge: 'tts:edge',
    Google: 'tts:google',
    Gemini: 'tts:gemini',
    OnProgress: 'tts:onProgress',
  },
  Keychain: {
    Get: 'keychain:get',
    Set: 'keychain:set',
    Delete: 'keychain:delete',
  },
  Stt: {
    Transcribe: 'stt:transcribe',
    Align: 'stt:align',
    GetToken: 'stt:getToken',
    OnProgress: 'stt:onProgress',
    WhisperModels: 'stt:whisper:models',
    WhisperDownload: 'stt:whisper:download',
    WhisperDelete: 'stt:whisper:delete',
    WhisperBinaryDownload: 'stt:whisper:binaryDownload',
  },
  Audio: {
    Merge: 'audio:merge',
    MergeMulti: 'audio:mergeMulti',
    SaveExternal: 'audio:saveExternal',
    SaveBlob: 'audio:saveBlob',
  },
  Video: {
    SaveTo: 'video:saveTo',
    Edit: 'video:edit',
    Cancel: 'video:cancel',
    OnProgress: 'video:onProgress',
    ApplyEffect: 'video:applyEffect',
    CancelEffect: 'video:cancelEffect',
    SaveEffect: 'video:saveEffect',
    FramesExtract: 'video:frames:extract',
    FramesLast: 'video:frames:last',
    SubtitleScreenshot: 'video:subtitleScreenshot',
  },
  Assets: {
    FontsList: 'assets:fonts:list',
    FontsUpload: 'assets:fonts:upload',
    FontsDelete: 'assets:fonts:delete',
    SfxList: 'assets:sfx:list',
    SfxUpload: 'assets:sfx:upload',
    SfxDelete: 'assets:sfx:delete',
  },
  Grok: {
    Login: 'grok:login',
    Generate: 'grok:generate',
    Cancel: 'grok:cancel',
    Close: 'grok:close',
    Status: 'grok:status',
    Batch: 'grok:batch',
    BridgeStatus: 'grok:bridge:status',
    BridgeSend: 'grok:bridge:send',
    BridgeCancel: 'grok:bridge:cancel',
    BridgeSetProject: 'grok:bridge:setProject',
    OnProgress: 'grok:onProgress',
    OnVideoReady: 'grok:onVideoReady',
  },
  Whisk: {
    UploadRef: 'whisk:uploadRef',
    Generate: 'whisk:generate',
  },
  Imagefx: {
    Login: 'imagefx:login',
    Generate: 'imagefx:generate',
    Close: 'imagefx:close',
  },
  Chat: {
    Cs: 'chat:cs',
    CsClear: 'chat:csClear',
    Dna: 'chat:dna',
    DnaClear: 'chat:dnaClear',
    Thumbnail: 'chat:thumbnail',
    HistoryLoad: 'chat:history:load',
    HistorySave: 'chat:history:save',
    HistoryClear: 'chat:history:clear',
  },
  Update: {
    On: 'update:on',
    Download: 'update:download',
    Install: 'update:install',
    Status: 'update:status',
    Recheck: 'update:recheck',
  },
  Page: {
    Find: 'page:find',
    StopFind: 'page:stopFind',
    OnFound: 'page:onFound',
  },
  Diagnostics: {
    ErrorReport: 'diagnostics:errorReport',
  },
  Drag: {
    Start: 'drag:start',
  },
  Remote: {
    Init: 'remote:init',
    OnGetScenes: 'remote:onGetScenes',
    SendScenes: 'remote:sendScenes',
    OnCommand: 'remote:onCommand',
    SendResponse: 'remote:sendResponse',
  },
} as const;

/**
 * 모든 채널명 union 타입 — 라우터 등록 검증에 사용.
 */
type ExtractValues<T> =
  T extends Record<string, infer V>
    ? V extends string
      ? V
      : V extends Record<string, unknown>
        ? ExtractValues<V>
        : never
    : never;

export type ChannelName = ExtractValues<typeof Channels>;

/**
 * IPC 응답 봉투. 모든 메인→렌더러 invoke 응답은 이 형태.
 */
export interface IpcSuccess<T> {
  ok: true;
  data: T;
}

export interface IpcFailure {
  ok: false;
  error: {
    code: string;
    message: string;
    hint?: string;
  };
}

export type IpcResponse<T> = IpcSuccess<T> | IpcFailure;
