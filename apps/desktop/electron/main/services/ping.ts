import { app } from 'electron';
import { Channels, AppSchemas, type PingResponse, type VersionResponse } from '@videoforge/shared';
import { registerHandler } from '../ipc-router';

/**
 * Phase 0 smoke test 핸들러.
 *
 * Renderer가 보낸 message를 echo로 돌려보내서 IPC가 정상 동작하는지 확인.
 */
export function registerAppHandlers(): void {
  registerHandler(Channels.App.Ping, AppSchemas.PingRequest, (input): Promise<PingResponse> => {
    return Promise.resolve({
      echo: input.message,
      receivedAt: new Date().toISOString(),
      pid: process.pid,
    });
  });

  registerHandler(
    Channels.App.GetVersion,
    AppSchemas.PingRequest.partial(), // 빈 객체도 허용
    (): Promise<VersionResponse> => {
      const arch = process.arch;
      if (arch !== 'arm64' && arch !== 'x64') {
        throw new Error(`Unsupported arch: ${arch}`);
      }
      return Promise.resolve({
        app: app.getVersion(),
        electron: process.versions.electron ?? 'unknown',
        node: process.versions.node,
        chrome: process.versions.chrome ?? 'unknown',
        v8: process.versions.v8,
        platform: 'darwin',
        arch,
      });
    },
  );
}
