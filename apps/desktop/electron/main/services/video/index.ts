import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import { ulid } from 'ulid';
import { Channels, VideoSchemas } from '@videoforge/shared';
import { registerHandler, UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';
import { runFfmpeg, ffprobe, getDurationMs, cancelTask } from './ffmpeg-runner';
import { compilePipeline } from './pipeline';
import type { VideoEditResponse, VideoProgressEvent } from '@videoforge/shared';

/**
 * P4-09 ~ P4-12: Video/Audio IPC handler registration.
 */
export function registerVideoHandlers(): void {
  // video:edit — main pipeline execution
  registerHandler(
    Channels.Video.Edit,
    VideoSchemas.VideoEditRequest,
    async (req, _ctx): Promise<VideoEditResponse> => {
      const taskId = req.taskId ?? ulid();

      // Determine total duration if not provided
      let totalDurationMs = req.totalDurationMs ?? 0;
      if (totalDurationMs === 0) {
        // Try to get duration from first concat input
        const firstStep = req.pipeline[0];
        if (firstStep?.kind === 'concat' && firstStep.inputs[0]) {
          try {
            const probe = await ffprobe(firstStep.inputs[0]);
            totalDurationMs = getDurationMs(probe) || 60000;
          } catch {
            totalDurationMs = 60000; // fallback 1min
          }
        } else {
          totalDurationMs = 60000;
        }
      }

      const { args, outputPath } = compilePipeline(req.pipeline, req.outputPath);

      logger.info({ taskId, steps: req.pipeline.length, outputPath }, 'video.edit.start');

      const sendProgress = (percent: number, currentStep?: string) => {
        const windows = BrowserWindow.getAllWindows();
        const payload: VideoProgressEvent = {
          taskId,
          percent,
          currentStep,
        };
        for (const win of windows) {
          win.webContents.send(Channels.Video.OnProgress, payload);
        }
      };

      const ac = new AbortController();

      await runFfmpeg({
        args,
        totalDurationMs,
        onProgress: (pct) => sendProgress(pct, 'encoding'),
        signal: ac.signal,
      });

      const stat = await fs.promises.stat(outputPath);
      const probe = await ffprobe(outputPath);
      const durationMs = getDurationMs(probe);

      logger.info({ taskId, durationMs, size: stat.size }, 'video.edit.done');

      return {
        outputPath,
        durationMs,
        sizeBytes: stat.size,
        taskId,
      };
    },
  );

  // video:cancel
  registerHandler(Channels.Video.Cancel, VideoSchemas.VideoCancelRequest, (req) => {
    cancelTask(req.taskId);
    return Promise.resolve({ ok: true });
  });

  // video:saveTo — copy file to user-selected location
  registerHandler(Channels.Video.SaveTo, VideoSchemas.VideoSaveToRequest, async (req) => {
    if (!fs.existsSync(req.sourcePath)) {
      throw new UserFacingError(`파일을 찾을 수 없습니다: ${req.sourcePath}`);
    }
    const dest = req.destinationPath ?? req.sourcePath;
    if (dest !== req.sourcePath) {
      await fs.promises.copyFile(req.sourcePath, dest);
    }
    return { savedPath: dest };
  });

  // video:frames:extract — extract frames at timestamps
  registerHandler(
    Channels.Video.FramesExtract,
    VideoSchemas.VideoFramesExtractRequest,
    async (req) => {
      await fs.promises.mkdir(req.outputDir, { recursive: true });
      const format = req.format ?? 'png';
      const frames: { timestampMs: number; path: string }[] = [];

      // Get video duration for special timestamps
      const probe = await ffprobe(req.videoPath);
      const totalMs = getDurationMs(probe);

      for (const ts of req.timestamps) {
        let ms: number;
        if (ts === 'first') ms = 0;
        else if (ts === 'middle') ms = totalMs / 2;
        else if (ts === 'last') ms = Math.max(0, totalMs - 100);
        else ms = ts;

        const sec = ms / 1000;
        const outFile = path.join(req.outputDir, `frame_${Math.round(ms)}.${format}`);

        await runFfmpeg({
          args: [
            '-ss',
            sec.toString(),
            '-i',
            req.videoPath,
            '-frames:v',
            '1',
            '-q:v',
            '2',
            '-y',
            outFile,
          ],
          totalDurationMs: 1000,
        });

        frames.push({ timestampMs: ms, path: outFile });
      }

      return { frames };
    },
  );

  // video:frames:last — extract last frame
  registerHandler(Channels.Video.FramesLast, VideoSchemas.VideoFramesLastRequest, async (req) => {
    const probe = await ffprobe(req.videoPath);
    const totalMs = getDurationMs(probe);
    const sec = Math.max(0, totalMs / 1000 - 0.1);

    const framePath = req.outputPath ?? path.join(os.tmpdir(), `vf-lastframe-${Date.now()}.png`);

    await runFfmpeg({
      args: [
        '-ss',
        sec.toString(),
        '-i',
        req.videoPath,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        '-y',
        framePath,
      ],
      totalDurationMs: 1000,
    });

    return { framePath };
  });

  // video:subtitleScreenshot — render ASS at specific time
  registerHandler(
    Channels.Video.SubtitleScreenshot,
    VideoSchemas.VideoSubtitleScreenshotRequest,
    async (req) => {
      const imagePath =
        req.outputPath ?? path.join(os.tmpdir(), `vf-sub-screenshot-${Date.now()}.png`);

      const sec = req.atMs / 1000;
      const w = req.resolution.w;
      const h = req.resolution.h;

      // Create blank video + subtitle burn
      const escPath = req.assPath.replace(/'/g, "'\\''").replace(/:/g, '\\:');

      await runFfmpeg({
        args: [
          '-f',
          'lavfi',
          '-i',
          `color=c=black:s=${w}x${h}:d=${sec + 1}`,
          '-vf',
          `subtitles='${escPath}'`,
          '-ss',
          sec.toString(),
          '-frames:v',
          '1',
          '-y',
          imagePath,
        ],
        totalDurationMs: 1000,
      });

      return { imagePath };
    },
  );
}
