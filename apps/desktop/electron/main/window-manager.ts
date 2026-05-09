import { BrowserWindow, app, shell } from 'electron';
import path from 'node:path';
import { logger } from './logger';

const windows = new Set<BrowserWindow>();

interface CreateWindowOptions {
  /** 새 창을 띄울 때의 라우트 (renderer 측 hash) */
  initialRoute?: string;
}

export function createWindow(opts: CreateWindowOptions = {}): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    titleBarStyle: 'hiddenInset', // macOS 트래픽 라이트 보존, 타이틀바 숨김
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#09090b', // zinc-950 — 첫 페인트 깜빡임 방지
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // workspace 패키지(@videoforge/shared) preload 번들 import 위해 필수
      webSecurity: true,
      devTools: !app.isPackaged,
    },
  });

  // 외부 링크는 시스템 브라우저로
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // 페이지 내 네비게이션 차단 (file:// 외)
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });

  // 첫 페인트 끝나면 표시 (FOUC 방지)
  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    windows.delete(win);
  });

  // dev 모드: vite dev server / prod: 번들된 html
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL + (opts.initialRoute ?? ''));
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const loadOpts: Electron.LoadFileOptions = {};
    const hash = opts.initialRoute?.replace(/^#/, '');
    if (hash) loadOpts.hash = hash;
    void win.loadFile(path.join(__dirname, '../renderer/index.html'), loadOpts);
  }

  windows.add(win);
  logger.info({ count: windows.size, route: opts.initialRoute }, 'window.created');
  return win;
}

export function getWindowCount(): number {
  return windows.size;
}

export function closeAllWindows(): void {
  for (const win of windows) {
    win.close();
  }
}

/**
 * 모든 윈도우에 IPC 이벤트 푸시.
 * 개별 윈도우 타게팅이 필요하면 webContents.send 직접 사용.
 */
export function broadcast(channel: string, payload: unknown): void {
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  }
}
