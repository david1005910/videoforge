import {
  AppSchemas,
  type IpcResponse,
  type PingRequest,
  type PingResponse,
  type VersionResponse,
} from '@videoforge/shared';

/**
 * IpcResponse 봉투에서 데이터를 꺼내거나 throw.
 * Renderer 코드는 이 함수 거쳐서만 IPC 결과를 사용.
 */
function unwrap<T>(resp: IpcResponse<T>): T {
  if (resp.ok) return resp.data;
  const err = new Error(resp.error.message);
  (err as Error & { code?: string; hint?: string }).code = resp.error.code;
  (err as Error & { code?: string; hint?: string }).hint = resp.error.hint;
  throw err;
}

export const api = {
  app: {
    async ping(req: PingRequest): Promise<PingResponse> {
      const resp = (await window.electronAPI.app.ping(req)) as IpcResponse<unknown>;
      return AppSchemas.PingResponse.parse(unwrap(resp));
    },
    async getVersion(): Promise<VersionResponse> {
      const resp = (await window.electronAPI.app.getVersion()) as IpcResponse<unknown>;
      return AppSchemas.VersionResponse.parse(unwrap(resp));
    },
  },
};
