import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import fs from 'fs-extra';
import { dialog, BrowserWindow } from 'electron';
import { Channels, UtilitySchemas } from '@videoforge/shared';
import type {
  FileSaveToDiskResponse,
  FileReadBase64Response,
  FileDownloadLocalResponse,
  FileSaveImageResponse,
  FileSaveTempResponse,
} from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { UserFacingError } from '../../ipc-router';
import { logger } from '../../logger';

const TEMP_DIR = path.join(os.tmpdir(), 'videoforge');

function mimeFromExt(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.ass': 'text/x-ssa',
  };
  return map[ext.toLowerCase()] ?? 'application/octet-stream';
}

export function registerFileHandlers(): void {
  registerHandler(
    Channels.File.SaveToDisk,
    UtilitySchemas.FileSaveToDiskRequest,
    async (req, ctx): Promise<FileSaveToDiskResponse> => {
      const win = BrowserWindow.fromId(ctx.senderId) ?? undefined;
      const opts: Electron.SaveDialogOptions = {
        defaultPath: req.defaultFilename,
      };
      if (req.filters) opts.filters = req.filters;
      const result = win
        ? await dialog.showSaveDialog(win, opts)
        : await dialog.showSaveDialog(opts);

      if (result.canceled || !result.filePath) {
        return { savedPath: null };
      }

      const buf = Uint8Array.from(Buffer.from(req.base64Data, 'base64'));
      await fs.writeFile(result.filePath, buf);
      logger.info({ path: result.filePath, bytes: buf.length }, 'file.savedToDisk');
      return { savedPath: result.filePath };
    },
  );

  registerHandler(
    Channels.File.ReadBase64,
    UtilitySchemas.FileReadBase64Request,
    async (req): Promise<FileReadBase64Response> => {
      if (!(await fs.pathExists(req.path))) {
        throw new UserFacingError(`파일을 찾을 수 없습니다: ${req.path}`);
      }

      const stat = await fs.stat(req.path);
      const maxBytes = req.maxBytes ?? 10 * 1024 * 1024;
      if (stat.size > maxBytes) {
        throw new UserFacingError(
          `파일이 너무 큽니다: ${Math.round(stat.size / 1024 / 1024)}MB`,
          `최대 ${Math.round(maxBytes / 1024 / 1024)}MB까지 읽을 수 있습니다.`,
        );
      }

      const buf = await fs.readFile(req.path);
      const ext = path.extname(req.path);
      return {
        base64Data: buf.toString('base64'),
        mimeType: mimeFromExt(ext),
        sizeBytes: stat.size,
      };
    },
  );

  registerHandler(
    Channels.File.DownloadLocal,
    UtilitySchemas.FileDownloadLocalRequest,
    async (req, ctx): Promise<FileDownloadLocalResponse> => {
      if (!(await fs.pathExists(req.sourcePath))) {
        throw new UserFacingError(`소스 파일을 찾을 수 없습니다: ${req.sourcePath}`);
      }

      let destPath = req.destinationPath;

      if (!destPath && req.prompt) {
        const win = BrowserWindow.fromId(ctx.senderId) ?? undefined;
        const opts = {
          defaultPath: path.basename(req.sourcePath),
        };
        const result = win
          ? await dialog.showSaveDialog(win, opts)
          : await dialog.showSaveDialog(opts);
        if (result.canceled || !result.filePath) {
          return { destinationPath: null };
        }
        destPath = result.filePath;
      }

      if (!destPath) {
        return { destinationPath: null };
      }

      await fs.copy(req.sourcePath, destPath);
      logger.info({ src: req.sourcePath, dest: destPath }, 'file.downloadLocal');
      return { destinationPath: destPath };
    },
  );

  registerHandler(
    Channels.File.SaveImage,
    UtilitySchemas.FileSaveImageRequest,
    async (req): Promise<FileSaveImageResponse> => {
      const extMap: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
      };
      const ext = extMap[req.mimeType] ?? '.png';
      const outputPath =
        req.outputPath ?? path.join(TEMP_DIR, 'images', `${crypto.randomUUID()}${ext}`);

      await fs.ensureDir(path.dirname(outputPath));
      const buf = Uint8Array.from(Buffer.from(req.base64Data, 'base64'));
      await fs.writeFile(outputPath, buf);
      return { imagePath: outputPath };
    },
  );

  registerHandler(
    Channels.File.SaveImageTemp,
    UtilitySchemas.FileSaveTempRequest,
    async (req): Promise<FileSaveTempResponse> => {
      return saveTempFile(req.base64Data, req.mimeType);
    },
  );

  registerHandler(
    Channels.File.SaveBlobTemp,
    UtilitySchemas.FileSaveTempRequest,
    async (req): Promise<FileSaveTempResponse> => {
      return saveTempFile(req.base64Data, req.mimeType);
    },
  );
}

async function saveTempFile(base64Data: string, mimeType: string): Promise<FileSaveTempResponse> {
  const ext = mimeType.split('/')[1] ?? 'bin';
  const tempPath = path.join(TEMP_DIR, 'temp', `${crypto.randomUUID()}.${ext}`);
  await fs.ensureDir(path.dirname(tempPath));
  const buf = Uint8Array.from(Buffer.from(base64Data, 'base64'));
  await fs.writeFile(tempPath, buf);
  return { tempPath };
}
