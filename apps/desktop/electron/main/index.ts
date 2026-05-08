import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import { createWindow } from './window-manager';
import { registerAppHandlers } from './services/ping';
import { logger } from './logger';

/**
 * 두 인스턴스 동시 실행 차단 (single-instance lock).
 */
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  // 두번째 인스턴스 실행 시 기존 창 포커스
  createWindow();
});

/**
 * macOS 네이티브 메뉴바.
 *
 * Phase 0에서는 최소 셋. Phase 1에서 i18n + 단축키 추가.
 */
function buildMenu(): void {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [
    ...(isMac
      ? ([
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ] satisfies MenuItemConstructorOptions[])
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => createWindow(),
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? ([
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' },
            ] satisfies MenuItemConstructorOptions[])
          : ([{ role: 'close' }] satisfies MenuItemConstructorOptions[])),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  logger.info(
    { electron: process.versions.electron, node: process.versions.node, arch: process.arch },
    'app.ready',
  );

  registerAppHandlers();
  buildMenu();
  createWindow();

  app.on('activate', () => {
    // macOS: dock 아이콘 클릭 시 창 없으면 새로 생성
    if (process.platform === 'darwin') {
      const { BrowserWindow } = require('electron') as typeof import('electron');
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    }
  });
});

app.on('window-all-closed', () => {
  // macOS: 명시적 quit 전까지 앱 유지 (관습)
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('app.before-quit');
});

// 미처리 예외 캡처 → 로그 + 비정상 종료 방지
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});
