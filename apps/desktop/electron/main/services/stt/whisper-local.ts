import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { logger } from '../../logger';
import { UserFacingError } from '../../ipc-router';
import { getWhisperBinaryPath, getModelPath, isBinaryReady } from './whisper-model';
import type {
  SttTranscribeRequest,
  SttTranscribeResponse,
  WhisperModelId,
} from '@videoforge/shared';

/**
 * P12: Local whisper.cpp transcription via child_process.
 *
 * Runs whisper.cpp CLI: ./whisper-cpp -m <model> -f <audio> -oj --output-json
 * Parses the JSON output to produce SttTranscribeResponse.
 */
export async function transcribeWhisperLocal(
  req: SttTranscribeRequest,
): Promise<SttTranscribeResponse> {
  if (!isBinaryReady()) {
    throw new UserFacingError(
      'whisper.cpp 바이너리가 설치되지 않았습니다',
      '설정 → Whisper에서 바이너리를 다운로드하세요.',
    );
  }

  const audioPath = req.audioPath;
  if (!fs.existsSync(audioPath)) {
    throw new UserFacingError(`오디오 파일을 찾을 수 없습니다: ${audioPath}`);
  }

  // Determine model: use req.model as model ID, or default
  const modelId = (req.model ?? 'ggml-large-v3-turbo-q5_0') as WhisperModelId;
  const modelPath = getModelPath(modelId);
  if (!modelPath) {
    throw new UserFacingError(
      `Whisper 모델이 없습니다: ${modelId}`,
      '설정에서 모델을 다운로드하세요.',
    );
  }

  const binPath = getWhisperBinaryPath();

  // whisper.cpp requires WAV input — convert if needed
  const wavPath = await ensureWav(audioPath);

  // whisper.cpp -oj writes JSON to a file (<output-file>.json), not stdout.
  // We specify -of to control the output path, then read the .json file after.
  const jsonOutBase = path.join(os.tmpdir(), `whisper-out-${Date.now()}`);

  const args = [
    '-m',
    modelPath,
    '-f',
    wavPath,
    '-l',
    mapLanguageCode(req.language),
    '-oj',
    '-of',
    jsonOutBase,
    '--no-prints',
  ];

  if (req.wordTimestamps && !['ko', 'ja', 'zh'].includes(req.language)) {
    args.push('--max-len', '1');
  }

  // Limit threads for Intel 16GB environment
  const cpuCount = os.cpus().length;
  const threads = Math.min(Math.max(1, cpuCount - 2), 4);
  args.push('-t', String(threads));

  logger.info({ binPath, modelId, audioPath, threads }, 'stt.whisper-local.start');

  await runWhisper(binPath, args);

  // Read the JSON output file written by whisper.cpp
  const jsonOutPath = `${jsonOutBase}.json`;
  let output: string;
  try {
    output = await fs.promises.readFile(jsonOutPath, 'utf-8');
  } catch {
    throw new UserFacingError(
      'Whisper JSON 출력 파일을 읽을 수 없습니다',
      `Expected: ${jsonOutPath}`,
    );
  }

  // Clean up temp files
  if (wavPath !== audioPath) {
    fs.unlink(wavPath, () => {
      /* cleanup */
    });
  }
  fs.unlink(jsonOutPath, () => {
    /* cleanup */
  });

  return parseWhisperOutput(output, req.language);
}

function runWhisper(binPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      binPath,
      args,
      {
        timeout: 5 * 60 * 1000, // 5 minute timeout
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large transcriptions
        env: { ...process.env, DYLD_LIBRARY_PATH: path.dirname(binPath) },
      },
      (error, _stdout, stderr) => {
        if (error) {
          logger.error({ error: error.message, stderr }, 'stt.whisper-local.error');
          reject(new UserFacingError('Whisper 실행 실패', stderr || error.message));
          return;
        }
        resolve();
      },
    );
  });
}

function parseWhisperOutput(output: string, language: string): SttTranscribeResponse {
  // whisper.cpp with -oj outputs JSON to stdout
  let data: WhisperCppJsonOutput;
  try {
    data = JSON.parse(output) as WhisperCppJsonOutput;
  } catch {
    // Fallback: try to find JSON in output (whisper may print other lines)
    const jsonMatch = /\{[\s\S]*\}/.exec(output);
    if (jsonMatch) {
      data = JSON.parse(jsonMatch[0]) as WhisperCppJsonOutput;
    } else {
      logger.warn({ output: output.slice(0, 500) }, 'stt.whisper-local.parse-fail');
      return {
        segments: [{ id: 0, start: 0, end: 0, text: output.trim() }],
        language,
        fullText: output.trim(),
        durationMs: 0,
      };
    }
  }

  const segments = (data.transcription ?? []).map((seg, i) => ({
    id: i,
    start: parseTimestamp(seg.timestamps?.from ?? '00:00:00.000'),
    end: parseTimestamp(seg.timestamps?.to ?? '00:00:00.000'),
    text: seg.text?.trim() ?? '',
    words: seg.tokens
      ?.filter((t) => t.text?.trim())
      .map((t) => ({
        word: t.text.trim(),
        start: parseTimestamp(t.timestamps?.from ?? '00:00:00.000'),
        end: parseTimestamp(t.timestamps?.to ?? '00:00:00.000'),
        probability: t.p,
      })),
  }));

  const fullText = segments.map((s) => s.text).join(' ');
  const lastSeg = segments[segments.length - 1];
  const durationMs = lastSeg ? lastSeg.end * 1000 : 0;

  logger.info({ segments: segments.length, duration: durationMs }, 'stt.whisper-local.done');

  return { segments, language, fullText, durationMs };
}

/**
 * Parse whisper.cpp timestamp format "HH:MM:SS.mmm" to seconds.
 */
function parseTimestamp(ts: string): number {
  // whisper.cpp uses comma as decimal separator: "00:00:05,230"
  const normalized = ts.replace(',', '.');
  const parts = normalized.split(':');
  if (parts.length !== 3) return 0;
  const hours = Number(parts[0]) || 0;
  const minutes = Number(parts[1]) || 0;
  const seconds = Number(parts[2]) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function mapLanguageCode(lang: string): string {
  const map: Record<string, string> = {
    ko: 'ko',
    en: 'en',
    ja: 'ja',
    zh: 'zh',
    he: 'he',
  };
  return map[lang] ?? lang;
}

/**
 * Ensure audio is in WAV format for whisper.cpp.
 * Uses ffmpeg-static to convert if necessary.
 */
async function ensureWav(audioPath: string): Promise<string> {
  const ext = path.extname(audioPath).toLowerCase();
  if (ext === '.wav') return audioPath;

  const { default: ffmpegPath } = await import('ffmpeg-static');
  if (!ffmpegPath) {
    throw new UserFacingError('ffmpeg를 찾을 수 없습니다');
  }

  const tmpWav = path.join(os.tmpdir(), `whisper-input-${Date.now()}.wav`);

  return new Promise((resolve, reject) => {
    execFile(
      ffmpegPath,
      ['-i', audioPath, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', '-y', tmpWav],
      { timeout: 60_000 },
      (error) => {
        if (error) {
          reject(new UserFacingError('오디오 WAV 변환 실패', error.message));
        } else {
          resolve(tmpWav);
        }
      },
    );
  });
}

interface WhisperCppJsonOutput {
  transcription?: {
    timestamps?: { from?: string; to?: string };
    text?: string;
    tokens?: {
      text: string;
      timestamps?: { from?: string; to?: string };
      p?: number;
    }[];
  }[];
}
