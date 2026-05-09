import { spawn, type ChildProcess } from 'node:child_process';
import { getFfmpegPath, getFfprobePath } from './ffmpeg-path';
import { logger } from '../../logger';

/**
 * P4-06: ffmpeg spawn runner with progress parsing and cancellation.
 */

export interface RunFfmpegOpts {
  args: string[];
  totalDurationMs: number;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Active task map for cancellation. */
const activeTasks = new Map<string, ChildProcess>();

export function registerTask(taskId: string, proc: ChildProcess): void {
  activeTasks.set(taskId, proc);
}

export function cancelTask(taskId: string): boolean {
  const proc = activeTasks.get(taskId);
  if (!proc) return false;
  proc.kill('SIGTERM');
  setTimeout(() => {
    if (!proc.killed) proc.kill('SIGKILL');
  }, 1000);
  activeTasks.delete(taskId);
  return true;
}

export function runFfmpeg(opts: RunFfmpegOpts): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpegPath = getFfmpegPath();

    const proc = spawn(ffmpegPath, [
      '-hide_banner',
      '-loglevel',
      'error',
      '-progress',
      'pipe:1',
      '-nostats',
      ...opts.args,
    ]);

    let stderr = '';

    proc.stderr?.on('data', (b: Buffer) => {
      stderr += b.toString();
    });

    proc.stdout?.on('data', (b: Buffer) => {
      const text = b.toString();
      const re = /out_time_ms=(\d+)/g;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        const ms = Number(match[1]) / 1000;
        const pct = Math.min(100, (ms / opts.totalDurationMs) * 100);
        opts.onProgress?.(Math.round(pct * 10) / 10);
      }
    });

    if (opts.signal) {
      const onAbort = () => {
        proc.kill('SIGTERM');
        setTimeout(() => {
          if (!proc.killed) proc.kill('SIGKILL');
        }, 1000);
      };
      opts.signal.addEventListener('abort', onAbort, { once: true });
    }

    proc.on('exit', (code) => {
      if (code === 0) {
        opts.onProgress?.(100);
        resolve();
      } else {
        logger.error({ code, stderr: stderr.slice(0, 500) }, 'ffmpeg.exit');
        reject(new Error(`ffmpeg exit ${code}\n${stderr.slice(0, 500)}`));
      }
    });

    proc.on('error', (err) => {
      logger.error({ err }, 'ffmpeg.spawn-error');
      reject(err);
    });
  });
}

/**
 * ffprobe로 미디어 정보 조회.
 */
export async function ffprobe(filePath: string): Promise<FfprobeResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn(getFfprobePath(), [
      '-v',
      'quiet',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);

    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (b: Buffer) => {
      stdout += b.toString();
    });
    proc.stderr?.on('data', (b: Buffer) => {
      stderr += b.toString();
    });

    proc.on('exit', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdout) as FfprobeResult);
        } catch {
          reject(new Error(`ffprobe JSON parse failed: ${stdout.slice(0, 200)}`));
        }
      } else {
        reject(new Error(`ffprobe exit ${code}: ${stderr.slice(0, 200)}`));
      }
    });

    proc.on('error', reject);
  });
}

export interface FfprobeResult {
  format?: {
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
  streams?: {
    codec_type?: string;
    codec_name?: string;
    width?: number;
    height?: number;
    duration?: string;
    r_frame_rate?: string;
  }[];
}

export function getDurationMs(probe: FfprobeResult): number {
  const d = probe.format?.duration;
  return d ? Math.round(parseFloat(d) * 1000) : 0;
}
