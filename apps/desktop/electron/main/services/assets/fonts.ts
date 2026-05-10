import fs from 'node:fs';
import path from 'node:path';
import { app, dialog, BrowserWindow } from 'electron';
import { logger } from '../../logger';
import type {
  FontInfo,
  FontsListResponse,
  FontsUploadResponse,
  FontsDeleteRequest,
} from '@videoforge/shared';

/**
 * P5-01: Font management service.
 *
 * User fonts stored in ~/Library/Application Support/VideoForge/Fonts/
 * Bundled Noto Sans KR in resources/fonts/
 */

const FONT_EXTENSIONS = new Set(['.ttf', '.otf', '.woff', '.woff2']);

function getUserFontsDir(): string {
  const dir = path.join(app.getPath('userData'), 'Fonts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getBundledFontsDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'fonts')
    : path.join(__dirname, '../../../../resources/fonts');
}

function detectScripts(fontName: string): FontInfo['scripts'] {
  const lower = fontName.toLowerCase();
  const scripts: FontInfo['scripts'] = ['latin'];
  if (/noto.*kr|malgun|gothic|gulim|batang|dotum/i.test(lower)) scripts.push('korean');
  if (/noto.*sc|noto.*tc|simsun|simhei|microsoft.*yahei/i.test(lower)) scripts.push('chinese');
  if (/noto.*jp|meiryo|hiragino|gothic/i.test(lower)) scripts.push('japanese');
  if (/noto.*hebrew|david|miriam|frank/i.test(lower)) scripts.push('hebrew');
  if (/noto.*arabic|tahoma|geeza/i.test(lower)) scripts.push('arabic');
  return scripts;
}

function parseFontFile(filePath: string, source: FontInfo['source']): FontInfo | null {
  const ext = path.extname(filePath).toLowerCase();
  if (!FONT_EXTENSIONS.has(ext)) return null;

  const basename = path.basename(filePath, ext);
  return {
    family: basename.replace(/[-_]/g, ' '),
    fullName: basename,
    postscriptName: basename.replace(/\s+/g, '-'),
    source,
    path: filePath,
    scripts: detectScripts(basename),
    italic: /italic|oblique/i.test(basename),
  };
}

function scanDir(dir: string, source: FontInfo['source']): FontInfo[] {
  if (!fs.existsSync(dir)) return [];
  const fonts: FontInfo[] = [];
  try {
    const files = fs.readdirSync(dir);
    for (const f of files) {
      const info = parseFontFile(path.join(dir, f), source);
      if (info) fonts.push(info);
    }
  } catch (err) {
    logger.warn({ dir, err }, 'fonts.scan-error');
  }
  return fonts;
}

// eslint-disable-next-line @typescript-eslint/require-await
export async function listFonts(): Promise<FontsListResponse> {
  const bundled = scanDir(getBundledFontsDir(), 'bundled');
  const user = scanDir(getUserFontsDir(), 'user');
  return { fonts: [...bundled, ...user] };
}

export async function uploadFonts(senderId?: number): Promise<FontsUploadResponse> {
  const win = senderId ? (BrowserWindow.fromId(senderId) ?? undefined) : undefined;
  const opts: Electron.OpenDialogOptions = {
    title: '폰트 파일 선택',
    filters: [{ name: 'Fonts', extensions: ['ttf', 'otf', 'woff', 'woff2'] }],
    properties: ['openFile', 'multiSelections'],
  };
  const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts);

  if (result.canceled || result.filePaths.length === 0) {
    return { added: [], skipped: [] };
  }

  const added: FontInfo[] = [];
  const skipped: { filename: string; reason: string }[] = [];
  const destDir = getUserFontsDir();

  for (const srcPath of result.filePaths) {
    const filename = path.basename(srcPath);
    const destPath = path.join(destDir, filename);

    if (fs.existsSync(destPath)) {
      skipped.push({ filename, reason: '이미 존재하는 폰트' });
      continue;
    }

    const info = parseFontFile(srcPath, 'user');
    if (!info) {
      skipped.push({ filename, reason: '지원하지 않는 형식' });
      continue;
    }

    await fs.promises.copyFile(srcPath, destPath);
    info.path = destPath;
    added.push(info);
  }

  logger.info({ added: added.length, skipped: skipped.length }, 'fonts.upload');
  return { added, skipped };
}

export async function deleteFont(req: FontsDeleteRequest): Promise<void> {
  const userDir = getUserFontsDir();
  const files = fs.readdirSync(userDir);

  for (const f of files) {
    const info = parseFontFile(path.join(userDir, f), 'user');
    if (info && info.postscriptName === req.postscriptName) {
      await fs.promises.unlink(path.join(userDir, f));
      logger.info({ font: req.postscriptName }, 'fonts.deleted');
      return;
    }
  }
}
