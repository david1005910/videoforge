import type { IpcResponse } from '@videoforge/shared';

export interface IpcError extends Error {
  code: string;
  hint: string | undefined;
}

export function unwrap<T>(resp: IpcResponse<T>): T {
  if (resp.ok) return resp.data;
  const err = new Error(resp.error.message) as IpcError;
  err.code = resp.error.code;
  err.hint = resp.error.hint;
  throw err;
}
