import fs from 'node:fs';
import { Channels, AudioSchemas } from '@videoforge/shared';
import { registerHandler, UserFacingError } from '../../ipc-router';
import { runFfmpeg, ffprobe, getDurationMs } from '../video/ffmpeg-runner';

/**
 * P4-11: Audio IPC handler registration.
 */
export function registerAudioHandlers(): void {
  // audio:merge — 2 tracks simple merge
  registerHandler(Channels.Audio.Merge, AudioSchemas.AudioMergeRequest, async (req) => {
    const [input1, input2] = req.inputs;

    for (const p of [input1, input2]) {
      if (!fs.existsSync(p)) {
        throw new UserFacingError(`오디오 파일을 찾을 수 없습니다: ${p}`);
      }
    }

    const vol = req.secondaryVolume ?? 1;

    await runFfmpeg({
      args: [
        '-i',
        input1,
        '-i',
        input2,
        '-filter_complex',
        `[1:a]volume=${vol}[a1];[0:a][a1]amix=inputs=2:duration=longest[aout]`,
        '-map',
        '[aout]',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-y',
        req.outputPath,
      ],
      totalDurationMs: 60000,
    });

    const probe = await ffprobe(req.outputPath);
    const durationMs = getDurationMs(probe);

    return { outputPath: req.outputPath, durationMs };
  });

  // audio:mergeMulti — N tracks with offsets/fades
  registerHandler(Channels.Audio.MergeMulti, AudioSchemas.AudioMergeMultiRequest, async (req) => {
    const inputArgs: string[] = [];
    const filterParts: string[] = [];

    for (let i = 0; i < req.tracks.length; i++) {
      const t = req.tracks[i]!;
      if (!fs.existsSync(t.path)) {
        throw new UserFacingError(`오디오 파일을 찾을 수 없습니다: ${t.path}`);
      }
      inputArgs.push('-i', t.path);

      const filters: string[] = [];
      if (t.volume !== 1) filters.push(`volume=${t.volume}`);
      if (t.fadeInMs > 0) filters.push(`afade=t=in:d=${t.fadeInMs / 1000}`);
      if (t.fadeOutMs > 0) filters.push(`afade=t=out:d=${t.fadeOutMs / 1000}`);
      if (t.offsetMs > 0) filters.push(`adelay=${t.offsetMs}|${t.offsetMs}`);

      if (filters.length > 0) {
        filterParts.push(`[${i}:a]${filters.join(',')}[a${i}]`);
      } else {
        filterParts.push(`[${i}:a]anull[a${i}]`);
      }
    }

    const mixInputs = req.tracks.map((_, i) => `[a${i}]`).join('');
    filterParts.push(`${mixInputs}amix=inputs=${req.tracks.length}:duration=longest[aout]`);

    const format = req.outputFormat ?? 'mp3';
    const codecArgs =
      format === 'wav'
        ? ['-c:a', 'pcm_s16le']
        : format === 'aac'
          ? ['-c:a', 'aac', '-b:a', '192k']
          : format === 'opus'
            ? ['-c:a', 'libopus', '-b:a', '128k']
            : ['-c:a', 'libmp3lame', '-b:a', '192k'];

    await runFfmpeg({
      args: [
        ...inputArgs,
        '-filter_complex',
        filterParts.join(';'),
        '-map',
        '[aout]',
        ...codecArgs,
        '-y',
        req.outputPath,
      ],
      totalDurationMs: 60000,
    });

    const stat = await fs.promises.stat(req.outputPath);
    const probe = await ffprobe(req.outputPath);
    const durationMs = getDurationMs(probe);

    return {
      outputPath: req.outputPath,
      durationMs,
      sizeBytes: stat.size,
    };
  });
}
