import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, BrowserWindow } from 'electron';
import { ulid } from 'ulid';
import { logger } from '../../logger';
import { ffprobe, getDurationMs } from '../video/ffmpeg-runner';
import type {
  SfxItem,
  SfxCategory,
  SfxListRequest,
  SfxListResponse,
  SfxUploadResponse,
  SfxDeleteRequest,
} from '@videoforge/shared';

/**
 * P5-03: SFX library service.
 *
 * User SFX stored in ~/Library/Application Support/VideoForge/SFX/
 */

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']);

function getUserSfxDir(): string {
  const dir = path.join(app.getPath('userData'), 'SFX');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/** Heuristic category from filename. */
function guessCategory(name: string): SfxCategory {
  const lower = name.toLowerCase();
  if (/whoosh|swish|swing/i.test(lower)) return 'whoosh';
  if (/impact|hit|boom|crash|thud/i.test(lower)) return 'impact';
  if (/click|tap|button|pop/i.test(lower)) return 'click';
  if (/transition|slide|sweep/i.test(lower)) return 'transition';
  if (/ambient|nature|rain|wind|crowd/i.test(lower)) return 'ambient';
  if (/notif|alert|bell|ding|chime/i.test(lower)) return 'notification';
  return 'other';
}

async function parseSfxFile(filePath: string, source: SfxItem['source']): Promise<SfxItem | null> {
  const ext = path.extname(filePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) return null;

  let durationMs = 0;
  try {
    const probe = await ffprobe(filePath);
    durationMs = getDurationMs(probe);
  } catch {
    // fallback: estimate from file size (128kbps)
    const stat = fs.statSync(filePath);
    durationMs = Math.round((stat.size * 8) / 128);
  }

  const basename = path.basename(filePath, ext);
  return {
    id: ulid(),
    name: basename,
    category: guessCategory(basename),
    durationMs,
    path: filePath,
    source,
    tags: [],
  };
}

export async function listSfx(req: SfxListRequest): Promise<SfxListResponse> {
  const userDir = getUserSfxDir();
  const items: SfxItem[] = [];

  if (fs.existsSync(userDir)) {
    const files = fs.readdirSync(userDir);
    for (const f of files) {
      const item = await parseSfxFile(path.join(userDir, f), 'user');
      if (item) {
        if (req.category && item.category !== req.category) continue;
        if (req.query && !item.name.toLowerCase().includes(req.query.toLowerCase())) continue;
        items.push(item);
      }
    }
  }

  return { items };
}

export async function uploadSfx(senderId?: number): Promise<SfxUploadResponse> {
  const win = senderId ? (BrowserWindow.fromId(senderId) ?? undefined) : undefined;
  const opts: Electron.OpenDialogOptions = {
    title: 'SFX 파일 선택',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'] }],
    properties: ['openFile', 'multiSelections'],
  };
  const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);

  if (result.canceled || result.filePaths.length === 0) {
    return { added: [], skipped: [] };
  }

  const added: SfxItem[] = [];
  const skipped: { filename: string; reason: string }[] = [];
  const destDir = getUserSfxDir();

  for (const srcPath of result.filePaths) {
    const filename = path.basename(srcPath);
    const destPath = path.join(destDir, filename);

    if (fs.existsSync(destPath)) {
      skipped.push({ filename, reason: '이미 존재하는 파일' });
      continue;
    }

    await fs.promises.copyFile(srcPath, destPath);
    const item = await parseSfxFile(destPath, 'user');
    if (item) {
      added.push(item);
    } else {
      skipped.push({ filename, reason: '지원하지 않는 형식' });
    }
  }

  logger.info({ added: added.length, skipped: skipped.length }, 'sfx.upload');
  return { added, skipped };
}

export async function deleteSfx(req: SfxDeleteRequest): Promise<void> {
  const userDir = getUserSfxDir();
  const files = fs.readdirSync(userDir);

  for (const f of files) {
    const ext = path.extname(f).toLowerCase();
    const basename = path.basename(f, ext);
    if (basename === req.id) {
      await fs.promises.unlink(path.join(userDir, f));
      logger.info({ id: req.id }, 'sfx.deleted');
      return;
    }
  }
}
