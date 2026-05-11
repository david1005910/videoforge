import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { logger } from '../../logger';
import { UserFacingError } from '../../ipc-router';
import type {
  WhisperModelId,
  WhisperModelInfo,
  WhisperModelsResponse,
  WhisperDownloadResponse,
} from '@videoforge/shared';

/**
 * P12: Whisper model & binary management.
 *
 * Models and the whisper.cpp binary are stored in:
 *   ~/Library/Application Support/VideoForge/whisper/
 */

const MODEL_CATALOG: Record<string, { label: string; sizeMB: number; fileName: string }> = {
  'ggml-tiny': { label: 'Tiny (75MB)', sizeMB: 75, fileName: 'ggml-tiny.bin' },
  'ggml-tiny.en': { label: 'Tiny English (75MB)', sizeMB: 75, fileName: 'ggml-tiny.en.bin' },
  'ggml-base': { label: 'Base (142MB)', sizeMB: 142, fileName: 'ggml-base.bin' },
  'ggml-base.en': { label: 'Base English (142MB)', sizeMB: 142, fileName: 'ggml-base.en.bin' },
  'ggml-small': { label: 'Small (466MB)', sizeMB: 466, fileName: 'ggml-small.bin' },
  'ggml-small.en': { label: 'Small English (466MB)', sizeMB: 466, fileName: 'ggml-small.en.bin' },
  'ggml-medium': { label: 'Medium (1.5GB)', sizeMB: 1500, fileName: 'ggml-medium.bin' },
  'ggml-medium.en': {
    label: 'Medium English (1.5GB)',
    sizeMB: 1500,
    fileName: 'ggml-medium.en.bin',
  },
  'ggml-large-v3': { label: 'Large v3 (3.1GB)', sizeMB: 3100, fileName: 'ggml-large-v3.bin' },
  'ggml-large-v3-turbo': {
    label: 'Large v3 Turbo (1.6GB)',
    sizeMB: 1600,
    fileName: 'ggml-large-v3-turbo.bin',
  },
  'ggml-large-v3-turbo-q5_0': {
    label: 'Large v3 Turbo Q5 (547MB) *recommended*',
    sizeMB: 547,
    fileName: 'ggml-large-v3-turbo-q5_0.bin',
  },
  'ggml-large-v3-turbo-q8_0': {
    label: 'Large v3 Turbo Q8 (834MB)',
    sizeMB: 834,
    fileName: 'ggml-large-v3-turbo-q8_0.bin',
  },
};

const WHISPER_BINARY_NAME = 'whisper-cpp';

const HUGGINGFACE_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

function getWhisperDir(): string {
  const dir = path.join(app.getPath('userData'), 'whisper');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getModelsDir(): string {
  const dir = path.join(getWhisperDir(), 'models');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBinaryPath(): string {
  return path.join(getWhisperDir(), WHISPER_BINARY_NAME);
}

export function isBinaryReady(): boolean {
  const binPath = getBinaryPath();
  const exists = fs.existsSync(binPath);
  const exec = exists && isExecutable(binPath);
  logger.info({ binPath, exists, executable: exec }, 'whisper.isBinaryReady');
  return exists && exec;
}

function isExecutable(filePath: string): boolean {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function getModelPath(modelId: WhisperModelId): string | undefined {
  const entry = MODEL_CATALOG[modelId];
  if (!entry) return undefined;
  const modelPath = path.join(getModelsDir(), entry.fileName);
  return fs.existsSync(modelPath) ? modelPath : undefined;
}

export function getWhisperBinaryPath(): string {
  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) {
    throw new UserFacingError(
      'whisper.cpp 바이너리가 없습니다',
      '설정에서 Whisper 바이너리를 다운로드하세요.',
    );
  }
  return binPath;
}

export function listModels(): WhisperModelsResponse {
  const models: WhisperModelInfo[] = [];

  for (const [id, entry] of Object.entries(MODEL_CATALOG)) {
    const modelPath = path.join(getModelsDir(), entry.fileName);
    const downloaded = fs.existsSync(modelPath);
    models.push({
      id: id as WhisperModelId,
      label: entry.label,
      sizeMB: entry.sizeMB,
      downloaded,
      ...(downloaded ? { filePath: modelPath } : {}),
    });
  }

  return { models, binaryReady: isBinaryReady() };
}

export async function downloadModel(
  modelId: WhisperModelId,
  onProgress?: (percent: number) => void,
): Promise<WhisperDownloadResponse> {
  const entry = MODEL_CATALOG[modelId];
  if (!entry) {
    throw new UserFacingError(`알 수 없는 모델: ${modelId}`);
  }

  const destPath = path.join(getModelsDir(), entry.fileName);

  if (fs.existsSync(destPath)) {
    logger.info({ modelId, destPath }, 'whisper.model.already-exists');
    return { modelId, filePath: destPath, sizeMB: entry.sizeMB };
  }

  const url = `${HUGGINGFACE_BASE}/${entry.fileName}`;
  logger.info({ modelId, url }, 'whisper.model.download.start');

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new UserFacingError(`모델 다운로드 실패 (${resp.status})`, `URL: ${url}`);
  }

  const contentLength = Number(resp.headers.get('content-length') ?? 0);
  const reader = resp.body?.getReader();
  if (!reader) {
    throw new UserFacingError('다운로드 스트림을 열 수 없습니다');
  }

  const tmpPath = destPath + '.tmp';
  const writeStream = fs.createWriteStream(tmpPath);
  let received = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      writeStream.write(Buffer.from(value));
      received += value.byteLength;
      if (contentLength > 0 && onProgress) {
        onProgress(Math.round((received / contentLength) * 100));
      }
    }
  } finally {
    writeStream.end();
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  fs.renameSync(tmpPath, destPath);
  const actualMB = Math.round(received / (1024 * 1024));
  logger.info({ modelId, destPath, sizeMB: actualMB }, 'whisper.model.download.done');

  return { modelId, filePath: destPath, sizeMB: actualMB };
}

export async function deleteModel(modelId: WhisperModelId): Promise<{ deleted: boolean }> {
  const entry = MODEL_CATALOG[modelId];
  if (!entry) {
    throw new UserFacingError(`알 수 없는 모델: ${modelId}`);
  }

  const modelPath = path.join(getModelsDir(), entry.fileName);
  if (fs.existsSync(modelPath)) {
    await fs.promises.unlink(modelPath);
    logger.info({ modelId, modelPath }, 'whisper.model.deleted');
    return { deleted: true };
  }
  return { deleted: false };
}

/**
 * Download pre-built whisper.cpp binary for macOS x64.
 *
 * Uses the official whisper.cpp releases from GitHub.
 * The user must trigger this manually from settings.
 */
export async function downloadBinary(onProgress?: (percent: number) => void): Promise<string> {
  const binPath = getBinaryPath();
  if (fs.existsSync(binPath) && isExecutable(binPath)) {
    return binPath;
  }

  // whisper.cpp release binary URL for macOS x64
  // Using v1.7.3 which supports Intel Macs without AVX2 requirement
  const releaseTag = 'v1.7.3';
  const url = `https://github.com/ggerganov/whisper.cpp/releases/download/${releaseTag}/whisper-${releaseTag}-bin-x86_64-apple-darwin.zip`;

  logger.info({ url }, 'whisper.binary.download.start');

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new UserFacingError(
      `whisper.cpp 바이너리 다운로드 실패 (${resp.status})`,
      '인터넷 연결을 확인하세요.',
    );
  }

  const contentLength = Number(resp.headers.get('content-length') ?? 0);
  const reader = resp.body?.getReader();
  if (!reader) {
    throw new UserFacingError('다운로드 스트림을 열 수 없습니다');
  }

  const chunks: Buffer[] = [];
  let received = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(Buffer.from(value));
    received += value.byteLength;
    if (contentLength > 0 && onProgress) {
      onProgress(Math.round((received / contentLength) * 100));
    }
  }

  const zipBuffer = Buffer.concat(chunks);
  const tmpZipPath = path.join(getWhisperDir(), 'whisper-bin.zip');
  await fs.promises.writeFile(tmpZipPath, zipBuffer);

  // Extract using system unzip
  const { execSync } = await import('node:child_process');
  const extractDir = path.join(getWhisperDir(), 'bin-extract');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`unzip -o "${tmpZipPath}" -d "${extractDir}"`, { stdio: 'pipe' });
  } catch {
    throw new UserFacingError('whisper.cpp 바이너리 압축 해제 실패');
  }

  // Find the main binary in extracted files
  const mainBin = findBinary(extractDir, 'main') ?? findBinary(extractDir, 'whisper');
  if (!mainBin) {
    throw new UserFacingError('whisper.cpp 바이너리를 압축 파일에서 찾을 수 없습니다');
  }

  await fs.promises.copyFile(mainBin, binPath);
  fs.chmodSync(binPath, 0o755);

  // Cleanup
  await fs.promises.rm(extractDir, { recursive: true, force: true });
  await fs.promises.unlink(tmpZipPath).catch((_e) => {
    /* cleanup */
  });

  logger.info({ binPath }, 'whisper.binary.download.done');
  return binPath;
}

function findBinary(dir: string, name: string): string | undefined {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findBinary(fullPath, name);
      if (found) return found;
    } else if (entry.name === name || entry.name === `${name}.exe`) {
      return fullPath;
    }
  }
  return undefined;
}
