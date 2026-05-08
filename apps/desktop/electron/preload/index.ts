import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import { Channels, type IpcResponse } from '@videoforge/shared';

/**
 * 메인 → 렌더러 이벤트 리스너 등록 헬퍼.
 *
 * 반환되는 함수 호출 시 리스너 해제.
 */
function onEvent<T>(channel: string, cb: (payload: T) => void): () => void {
  const wrapped = (_e: IpcRendererEvent, payload: T): void => cb(payload);
  ipcRenderer.on(channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

/**
 * Renderer에서 호출 가능한 IPC API.
 *
 * 모든 응답은 IpcResponse<T> 형태 — { ok: true, data } 또는 { ok: false, error }.
 * Renderer 측 lib/api.ts 가 unwrap 책임.
 */
const api = {
  app: {
    ping: (payload: unknown): Promise<IpcResponse<unknown>> =>
      ipcRenderer.invoke(Channels.App.Ping, payload),
    getVersion: (): Promise<IpcResponse<unknown>> =>
      ipcRenderer.invoke(Channels.App.GetVersion, {}),
  },
  // Phase 1+ 채널들은 같은 패턴으로 추가됨
  // project: { save, load, list, delete }
  // tts: { edge, google, gemini, onProgress }
  // stt: { transcribe, align, onProgress }
  // video: { edit, cancel, onProgress }
  // ...

  /**
   * 메인 → 렌더러 이벤트 구독.
   * 채널명은 Channels enum 사용 권장.
   */
  on: onEvent,
};

contextBridge.exposeInMainWorld('electronAPI', api);

export type ElectronAPI = typeof api;
