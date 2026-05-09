import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let testUserData: string;
let testResourcesPath: string;

beforeEach(() => {
  testUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-fonts-'));
  testResourcesPath = path.join(testUserData, '__resources__');
  // Ensure process.resourcesPath exists for isPackaged=true
  Object.defineProperty(process, 'resourcesPath', {
    value: testResourcesPath,
    writable: true,
    configurable: true,
  });
  vi.resetModules();
  vi.mock('electron', () => ({
    app: {
      getPath: () => testUserData,
      isPackaged: true,
    },
    dialog: { showOpenDialog: vi.fn() },
  }));
});

// Temp dirs are cleaned up by the OS — avoiding rmSync prevents
// ENOENT from lazy module-level references to the deleted path.

describe('fonts service', () => {
  it('listFonts returns empty when no fonts exist', async () => {
    const { listFonts } = await import('./fonts');
    const res = await listFonts();
    expect(res.fonts).toEqual([]);
  });

  it('listFonts scans user fonts directory', async () => {
    const fontsDir = path.join(testUserData, 'Fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'TestFont.ttf'), 'fake-font-data');

    const { listFonts } = await import('./fonts');
    const res = await listFonts();
    expect(res.fonts.length).toBe(1);
    const font = res.fonts[0]!;
    expect(font.family).toBe('TestFont');
    expect(font.source).toBe('user');
    expect(font.scripts).toContain('latin');
  });

  it('deleteFont removes user font by postscriptName', async () => {
    const fontsDir = path.join(testUserData, 'Fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'MyFont.otf'), 'fake');

    const { deleteFont, listFonts } = await import('./fonts');
    await deleteFont({ postscriptName: 'MyFont' });

    const res = await listFonts();
    expect(res.fonts.length).toBe(0);
  });

  it('detectScripts identifies Korean font', async () => {
    const fontsDir = path.join(testUserData, 'Fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'NotoSansKR-Regular.ttf'), 'fake');

    const { listFonts } = await import('./fonts');
    const res = await listFonts();
    const font = res.fonts[0]!;
    expect(font.scripts).toContain('korean');
  });
});
