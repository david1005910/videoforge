import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { isPackaged: false, getPath: () => '/tmp/videoforge-test' },
  ipcMain: { handle: vi.fn(), removeHandler: vi.fn() },
}));

import { compilePipeline } from './pipeline';

describe('Pipeline Compiler', () => {
  it('compiles concat step with copyOnly', () => {
    const result = compilePipeline(
      [{ kind: 'concat', inputs: ['/a.mp4', '/b.mp4'], copyOnly: true }],
      '/out.mp4',
    );
    expect(result.args).toContain('-f');
    expect(result.args).toContain('concat');
    expect(result.args).toContain('-c');
    expect(result.args).toContain('copy');
    expect(result.outputPath).toBe('/out.mp4');
  });

  it('compiles concat step with re-encode', () => {
    const result = compilePipeline(
      [{ kind: 'concat', inputs: ['/a.mp4'], copyOnly: false }],
      '/out.mp4',
    );
    expect(result.args).toContain('libx264');
  });

  it('compiles kenBurns step', () => {
    const result = compilePipeline(
      [
        {
          kind: 'kenBurns',
          image: '/photo.png',
          durationMs: 5000,
          from: { x: 0, y: 0, w: 1920, h: 1080 },
          to: { x: 100, y: 100, w: 1720, h: 880 },
        },
      ],
      '/out.mp4',
    );
    expect(result.args).toContain('-loop');
    expect(result.args).toContain('/photo.png');
    expect(result.args).toContain('/out.mp4');
  });

  it('compiles export step with h264', () => {
    const result = compilePipeline(
      [
        {
          kind: 'export',
          resolution: { w: 1920, h: 1080, fps: 30 },
          codec: 'h264',
          bitrate: '8M',
          audioCodec: 'aac',
          audioBitrate: '192k',
        },
      ],
      '/final.mp4',
    );
    expect(result.args).toContain('libx264');
    expect(result.args).toContain('8M');
    expect(result.args).toContain('aac');
  });

  it('compiles effect step (fade)', () => {
    const result = compilePipeline(
      [
        {
          kind: 'effect',
          type: 'fade',
          startMs: 0,
          durationMs: 1000,
          params: {},
        },
      ],
      '/out.mp4',
    );
    expect(result.args.some((a) => a.includes('fade'))).toBe(true);
  });
});
