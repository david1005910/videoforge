import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { Channels, type IpcResponse } from '@videoforge/shared';

/**
 * 메인 → 렌더러 이벤트 리스너 등록 헬퍼.
 * 반환되는 함수 호출 시 리스너 해제.
 */
function onEvent<T>(channel: string, cb: (payload: T) => void): () => void {
  const wrapped = (_e: IpcRendererEvent, payload: T): void => cb(payload);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

/** invoke 축약 */
function invoke(channel: string, payload?: unknown): Promise<IpcResponse<unknown>> {
  return ipcRenderer.invoke(channel, payload ?? {});
}

/**
 * Renderer에서 호출 가능한 IPC API.
 *
 * 모든 응답은 IpcResponse<T> 형태 — { ok: true, data } 또는 { ok: false, error }.
 * Renderer 측 lib/api.ts 가 unwrap 책임.
 */
const api = {
  // === App (Phase 0) ===
  app: {
    ping: (payload: unknown) => invoke(Channels.App.Ping, payload),
    getVersion: () => invoke(Channels.App.GetVersion),
  },

  // === Project (Phase 1 — P1-04) ===
  project: {
    save: (payload: unknown) => invoke(Channels.Project.Save, payload),
    load: (payload: unknown) => invoke(Channels.Project.Load, payload),
    list: (payload?: unknown) => invoke(Channels.Project.List, payload),
    delete: (payload: unknown) => invoke(Channels.Project.Delete, payload),
  },

  // === Dialog (Phase 1 — P1-08) ===
  dialog: {
    selectFolder: (payload?: unknown) => invoke(Channels.Dialog.SelectFolder, payload),
    alert: (payload: unknown) => invoke(Channels.Dialog.Alert, payload),
    confirm: (payload: unknown) => invoke(Channels.Dialog.Confirm, payload),
  },

  // === File (Phase 1 — P1-08) ===
  file: {
    saveToDisk: (payload: unknown) => invoke(Channels.File.SaveToDisk, payload),
    readBase64: (payload: unknown) => invoke(Channels.File.ReadBase64, payload),
    downloadLocal: (payload: unknown) => invoke(Channels.File.DownloadLocal, payload),
    saveImage: (payload: unknown) => invoke(Channels.File.SaveImage, payload),
    saveImageTemp: (payload: unknown) => invoke(Channels.File.SaveImageTemp, payload),
    saveBlobTemp: (payload: unknown) => invoke(Channels.File.SaveBlobTemp, payload),
  },

  // === Shell / Clipboard (Phase 1 — P1-09) ===
  shell: {
    openExternal: (payload: unknown) => invoke(Channels.Shell.OpenExternal, payload),
  },
  clipboard: {
    write: (payload: unknown) => invoke(Channels.Clipboard.Write, payload),
    writeSync: (payload: unknown) => invoke(Channels.Clipboard.WriteSync, payload),
  },

  // === Window (Phase 1 — P1-12) ===
  window: {
    openNew: (payload?: unknown) => invoke(Channels.Window.OpenNew, payload),
    count: () => invoke(Channels.Window.Count),
  },

  // === Keychain (Phase 2 — P2-07) ===
  keychain: {
    get: (payload: unknown) => invoke(Channels.Keychain.Get, payload),
    set: (payload: unknown) => invoke(Channels.Keychain.Set, payload),
    delete: (payload: unknown) => invoke(Channels.Keychain.Delete, payload),
  },

  // === TTS (Phase 2 — P2-06) ===
  tts: {
    edge: (payload: unknown) => invoke(Channels.Tts.Edge, payload),
    google: (payload: unknown) => invoke(Channels.Tts.Google, payload),
    gemini: (payload: unknown) => invoke(Channels.Tts.Gemini, payload),
    onProgress: (cb: (payload: unknown) => void) => onEvent(Channels.Tts.OnProgress, cb),
  },

  // === Video (Phase 4 — P4-09) ===
  video: {
    edit: (payload: unknown) => invoke(Channels.Video.Edit, payload),
    cancel: (payload: unknown) => invoke(Channels.Video.Cancel, payload),
    saveTo: (payload: unknown) => invoke(Channels.Video.SaveTo, payload),
    framesExtract: (payload: unknown) => invoke(Channels.Video.FramesExtract, payload),
    framesLast: (payload: unknown) => invoke(Channels.Video.FramesLast, payload),
    subtitleScreenshot: (payload: unknown) => invoke(Channels.Video.SubtitleScreenshot, payload),
    onProgress: (cb: (payload: unknown) => void) => onEvent(Channels.Video.OnProgress, cb),
  },

  // === Audio (Phase 4 — P4-11) ===
  audio: {
    merge: (payload: unknown) => invoke(Channels.Audio.Merge, payload),
    mergeMulti: (payload: unknown) => invoke(Channels.Audio.MergeMulti, payload),
  },

  // === Assets (Phase 5) ===
  assets: {
    fontsList: () => invoke(Channels.Assets.FontsList),
    fontsUpload: () => invoke(Channels.Assets.FontsUpload),
    fontsDelete: (payload: unknown) => invoke(Channels.Assets.FontsDelete, payload),
    sfxList: (payload?: unknown) => invoke(Channels.Assets.SfxList, payload),
    sfxUpload: () => invoke(Channels.Assets.SfxUpload),
    sfxDelete: (payload: unknown) => invoke(Channels.Assets.SfxDelete, payload),
  },

  // === Grok (Phase 6 — P6-09/10) ===
  grok: {
    login: () => invoke(Channels.Grok.Login),
    generate: (payload: unknown) => invoke(Channels.Grok.Generate, payload),
    batch: (payload: unknown) => invoke(Channels.Grok.Batch, payload),
    cancel: (payload: unknown) => invoke(Channels.Grok.Cancel, payload),
    close: () => invoke(Channels.Grok.Close),
    status: () => invoke(Channels.Grok.Status),
    onProgress: (cb: (payload: unknown) => void) => onEvent(Channels.Grok.OnProgress, cb),
    onVideoReady: (cb: (payload: unknown) => void) => onEvent(Channels.Grok.OnVideoReady, cb),
  },

  // === Whisk (Phase 7 — P7-06) ===
  whisk: {
    uploadRef: (payload: unknown) => invoke(Channels.Whisk.UploadRef, payload),
    generate: (payload: unknown) => invoke(Channels.Whisk.Generate, payload),
  },

  // === ImageFX (Phase 7 — P7-06) ===
  imagefx: {
    login: () => invoke(Channels.Imagefx.Login),
    generate: (payload: unknown) => invoke(Channels.Imagefx.Generate, payload),
    close: () => invoke(Channels.Imagefx.Close),
  },

  // === Chat (Phase 8 — P8-05) ===
  chat: {
    cs: (payload: unknown) => invoke(Channels.Chat.Cs, payload),
    csClear: () => invoke(Channels.Chat.CsClear),
    dna: (payload: unknown) => invoke(Channels.Chat.Dna, payload),
    dnaClear: () => invoke(Channels.Chat.DnaClear),
    thumbnail: (payload: unknown) => invoke(Channels.Chat.Thumbnail, payload),
  },

  // === STT (Phase 3 — P3-05) ===
  stt: {
    transcribe: (payload: unknown) => invoke(Channels.Stt.Transcribe, payload),
    align: (payload: unknown) => invoke(Channels.Stt.Align, payload),
    onProgress: (cb: (payload: unknown) => void) => onEvent(Channels.Stt.OnProgress, cb),
  },

  // === Update (Phase 10 — P10-02) ===
  update: {
    status: () => invoke(Channels.Update.Status),
    recheck: () => invoke(Channels.Update.Recheck),
    download: () => invoke(Channels.Update.Download),
    install: () => invoke(Channels.Update.Install),
    onStatus: (cb: (payload: unknown) => void) => onEvent(Channels.Update.On, cb),
  },

  /**
   * 메인 → 렌더러 이벤트 구독.
   * 채널명은 Channels enum 사용 권장.
   */
  on: onEvent,
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
