import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PipelineStep } from '@videoforge/shared';

/**
 * P4-01 ~ P4-04: Pipeline compiler.
 *
 * PipelineStep[] → ffmpeg args.
 */

interface CompileResult {
  args: string[];
  outputPath: string;
}

export function compilePipeline(steps: PipelineStep[], outputPath: string): CompileResult {
  const args: string[] = [];

  for (const step of steps) {
    switch (step.kind) {
      case 'concat':
        return compileConcat(step, outputPath);
      case 'subtitleBurn':
        return compileSubtitleBurn(step, args, outputPath);
      case 'audioMix':
        return compileAudioMix(step, outputPath);
      case 'kenBurns':
        return compileKenBurns(step, outputPath);
      case 'effect':
        return compileEffect(step, args, outputPath);
      case 'export':
        return compileExport(step, args, outputPath);
      case 'compose':
        return compileCompose(step, outputPath);
    }
  }

  return { args, outputPath };
}

function compileConcat(
  step: Extract<PipelineStep, { kind: 'concat' }>,
  outputPath: string,
): CompileResult {
  // Create concat demuxer file
  const listPath = path.join(os.tmpdir(), `vf-concat-${Date.now()}.txt`);
  const lines = step.inputs.map((p) => `file '${p.replace(/'/g, "'\\''")}'`);
  fs.writeFileSync(listPath, lines.join('\n'));

  const args = ['-f', 'concat', '-safe', '0', '-i', listPath];

  if (step.copyOnly) {
    args.push('-c', 'copy');
  } else {
    args.push('-c:v', 'libx264', '-preset', 'faster', '-crf', '23');
    args.push('-c:a', 'aac', '-b:a', '192k');
  }

  args.push('-y', outputPath);
  return { args, outputPath };
}

function compileSubtitleBurn(
  step: Extract<PipelineStep, { kind: 'subtitleBurn' }>,
  inputArgs: string[],
  outputPath: string,
): CompileResult {
  // Path escaping for ASS filter
  const escPath = step.subPath.replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:');

  const fontsDir = step.fontsDir.replace(/:/g, '\\:');

  const args = [
    ...inputArgs,
    '-vf',
    `subtitles='${escPath}':fontsdir='${fontsDir}'`,
    '-c:v',
    'libx264',
    '-preset',
    'faster',
    '-crf',
    '23',
    '-c:a',
    'copy',
    '-y',
    outputPath,
  ];

  return { args, outputPath };
}

function compileAudioMix(
  step: Extract<PipelineStep, { kind: 'audioMix' }>,
  outputPath: string,
): CompileResult {
  const args: string[] = [];

  for (const track of step.tracks) {
    args.push('-i', track.path);
  }

  const filterParts: string[] = [];
  for (let i = 0; i < step.tracks.length; i++) {
    const t = step.tracks[i]!;
    let chain = `[${i}:a]`;
    const filters: string[] = [];

    if (t.volume !== 1) {
      filters.push(`volume=${t.volume}`);
    }
    if (t.fadeInMs > 0) {
      filters.push(`afade=t=in:d=${t.fadeInMs / 1000}`);
    }
    if (t.fadeOutMs > 0) {
      filters.push(`afade=t=out:d=${t.fadeOutMs / 1000}`);
    }
    if (t.offsetMs > 0) {
      filters.push(`adelay=${t.offsetMs}|${t.offsetMs}`);
    }

    if (filters.length > 0) {
      chain += filters.join(',') + `[a${i}]`;
    } else {
      chain = `[${i}:a]anull[a${i}]`;
    }
    filterParts.push(chain);
  }

  const mixInputs = step.tracks.map((_, i) => `[a${i}]`).join('');
  filterParts.push(`${mixInputs}amix=inputs=${step.tracks.length}:duration=longest[aout]`);

  args.push(
    '-filter_complex',
    filterParts.join(';'),
    '-map',
    '[aout]',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-y',
    outputPath,
  );

  return { args, outputPath };
}

function compileKenBurns(
  step: Extract<PipelineStep, { kind: 'kenBurns' }>,
  outputPath: string,
): CompileResult {
  const dur = step.durationMs / 1000;
  const fps = 30;
  const totalFrames = Math.ceil(dur * fps);

  const args = [
    '-loop',
    '1',
    '-i',
    step.image,
    '-vf',
    `zoompan=z='1.0+0.001*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1920x1080:fps=${fps}`,
    '-t',
    dur.toString(),
    '-c:v',
    'libx264',
    '-preset',
    'faster',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-y',
    outputPath,
  ];

  return { args, outputPath };
}

function compileEffect(
  step: Extract<PipelineStep, { kind: 'effect' }>,
  inputArgs: string[],
  outputPath: string,
): CompileResult {
  const dur = step.durationMs / 1000;
  const start = step.startMs / 1000;

  let vf = '';
  switch (step.type) {
    case 'fade':
      vf = `fade=t=in:st=${start}:d=${dur}`;
      break;
    case 'blur':
      vf = `boxblur=10:enable='between(t,${start},${start + dur})'`;
      break;
    case 'zoom':
      vf = `zoompan=z='if(between(on,${start * 30},${(start + dur) * 30}),1.0+0.002*(on-${start * 30}),1)':d=1:s=1920x1080`;
      break;
    default:
      vf = 'null';
  }

  const args = [
    ...inputArgs,
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'faster',
    '-crf',
    '23',
    '-c:a',
    'copy',
    '-y',
    outputPath,
  ];

  return { args, outputPath };
}

function compileExport(
  step: Extract<PipelineStep, { kind: 'export' }>,
  inputArgs: string[],
  outputPath: string,
): CompileResult {
  const args = [...inputArgs];

  // Video codec
  if (step.codec === 'h264') {
    args.push('-c:v', 'libx264');
    if (step.bitrate.startsWith('crf:')) {
      args.push('-crf', step.bitrate.slice(4));
    } else {
      args.push('-b:v', step.bitrate);
    }
    args.push('-preset', 'faster');
  } else if (step.codec === 'prores') {
    args.push('-c:v', 'prores_ks', '-profile:v', '3');
  }
  // h265 forbidden locally (ADR-005)

  // Resolution
  args.push('-vf', `scale=${step.resolution.w}:${step.resolution.h}`);

  // Audio
  args.push('-c:a', step.audioCodec, '-b:a', step.audioBitrate);

  args.push('-y', outputPath);
  return { args, outputPath };
}

function compileCompose(
  step: Extract<PipelineStep, { kind: 'compose' }>,
  outputPath: string,
): CompileResult {
  const args: string[] = [];

  // Input: loop image as video source
  args.push('-loop', '1', '-i', step.image);

  // Input: audio (if provided)
  if (step.audio) {
    args.push('-i', step.audio);
  }

  // Resolve subtitle path — write content to temp file if needed
  let subPath = step.subtitlePath;
  if (!subPath && step.subtitleContent) {
    subPath = path.join(os.tmpdir(), `vf-compose-sub-${Date.now()}.ass`);
    fs.writeFileSync(subPath, step.subtitleContent, 'utf-8');
  }

  // Video filter: subtitle burn (if provided)
  if (subPath) {
    const escPath = subPath.replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:');
    if (step.fontsDir) {
      const escFonts = step.fontsDir.replace(/:/g, '\\:');
      args.push('-vf', `subtitles='${escPath}':fontsdir='${escFonts}'`);
    } else {
      args.push('-vf', `subtitles='${escPath}'`);
    }
  }

  // Video codec
  args.push('-c:v', 'libx264', '-preset', 'faster', '-crf', '23', '-pix_fmt', 'yuv420p');

  if (step.audio) {
    // Audio codec + use audio duration
    args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
  } else {
    // No audio: use explicit duration
    const dur = (step.durationMs ?? 10000) / 1000;
    args.push('-t', dur.toString(), '-an');
  }

  args.push('-y', outputPath);
  return { args, outputPath };
}
