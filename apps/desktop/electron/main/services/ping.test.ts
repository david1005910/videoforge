import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppSchemas } from '@videoforge/shared';

// electron 모듈 모킹 — 메인 프로세스 코드는 직접 import 못 하므로
// 핸들러 로직만 추출해서 테스트.
vi.mock('electron', () => ({
  app: {
    getVersion: () => '0.0.1-test',
    isPackaged: false,
    getPath: () => '/tmp/videoforge-test',
  },
  ipcMain: {
    handle: vi.fn(),
    removeHandler: vi.fn(),
  },
}));

describe('app schemas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('PingRequest validates message', () => {
    const ok = AppSchemas.PingRequest.safeParse({ message: 'hi' });
    expect(ok.success).toBe(true);

    const tooShort = AppSchemas.PingRequest.safeParse({ message: '' });
    expect(tooShort.success).toBe(false);

    const wrongType = AppSchemas.PingRequest.safeParse({ message: 123 });
    expect(wrongType.success).toBe(false);
  });

  it('PingResponse requires ISO datetime', () => {
    const valid = AppSchemas.PingResponse.safeParse({
      echo: 'test',
      receivedAt: new Date().toISOString(),
      pid: 12345,
    });
    expect(valid.success).toBe(true);

    const invalidDate = AppSchemas.PingResponse.safeParse({
      echo: 'test',
      receivedAt: 'not-a-date',
      pid: 12345,
    });
    expect(invalidDate.success).toBe(false);
  });

  it('VersionResponse only allows darwin', () => {
    const ok = AppSchemas.VersionResponse.safeParse({
      app: '0.0.1',
      electron: '33.0.0',
      node: '20.18.0',
      chrome: '130.0.0',
      v8: '12.4',
      platform: 'darwin',
      arch: 'arm64',
    });
    expect(ok.success).toBe(true);

    const wrongPlatform = AppSchemas.VersionResponse.safeParse({
      app: '0.0.1',
      electron: '33.0.0',
      node: '20.18.0',
      chrome: '130.0.0',
      v8: '12.4',
      platform: 'win32',
      arch: 'x64',
    });
    expect(wrongPlatform.success).toBe(false);
  });

  it('VersionResponse rejects exotic architectures', () => {
    const wrongArch = AppSchemas.VersionResponse.safeParse({
      app: '0.0.1',
      electron: '33.0.0',
      node: '20.18.0',
      chrome: '130.0.0',
      v8: '12.4',
      platform: 'darwin',
      arch: 'mips',
    });
    expect(wrongArch.success).toBe(false);
  });
});
