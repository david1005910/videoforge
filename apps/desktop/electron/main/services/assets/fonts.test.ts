import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Mock electron
vi.mock('electron', () => ({
  app: {
    getPath: () => testUserData,
    isPackaged: false,
  },
  dialog: {
    showOpenDialog: vi.fn(),
  },
}));

let testUserData: string;

beforeEach(() => {
  testUserData = fs.mkdtempSync(path.join(os.tmpdir(), 'vf-fonts-'));
});

afterEach(() => {
  fs.rmSync(testUserData, { recursive: true, force: true });
});

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

    // Re-import to pick up new testUserData
    vi.resetModules();
    vi.mock('electron', () => ({
      app: { getPath: () => testUserData, isPackaged: false },
      dialog: { showOpenDialog: vi.fn() },
    }));
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

    vi.resetModules();
    vi.mock('electron', () => ({
      app: { getPath: () => testUserData, isPackaged: false },
      dialog: { showOpenDialog: vi.fn() },
    }));
    const { deleteFont, listFonts } = await import('./fonts');
    await deleteFont({ postscriptName: 'MyFont' });

    const res = await listFonts();
    expect(res.fonts.length).toBe(0);
  });

  it('detectScripts identifies Korean font', async () => {
    const fontsDir = path.join(testUserData, 'Fonts');
    fs.mkdirSync(fontsDir, { recursive: true });
    fs.writeFileSync(path.join(fontsDir, 'NotoSansKR-Regular.ttf'), 'fake');

    vi.resetModules();
    vi.mock('electron', () => ({
      app: { getPath: () => testUserData, isPackaged: false },
      dialog: { showOpenDialog: vi.fn() },
    }));
    const { listFonts } = await import('./fonts');
    const res = await listFonts();
    const font = res.fonts[0]!;
    expect(font.scripts).toContain('korean');
  });
});
