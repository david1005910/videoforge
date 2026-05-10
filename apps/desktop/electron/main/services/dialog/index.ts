import { dialog, BrowserWindow } from 'electron';
import { Channels, UtilitySchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';

function getWindow(senderId: number): BrowserWindow | undefined {
  return BrowserWindow.fromId(senderId) ?? undefined;
}

export function registerDialogHandlers(): void {
  registerHandler(
    Channels.Dialog.SelectFolder,
    UtilitySchemas.DialogSelectFolderRequest,
    async (req, ctx) => {
      const win = getWindow(ctx.senderId);
      const opts: Electron.OpenDialogOptions = {
        title: req.title ?? '폴더 선택',
        properties: ['openDirectory', 'createDirectory'],
      };
      if (req.defaultPath) opts.defaultPath = req.defaultPath;
      const result = win
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts);
      return {
        folderPath: result.canceled ? null : (result.filePaths[0] ?? null),
      };
    },
  );

  registerHandler(
    Channels.Dialog.SelectFile,
    UtilitySchemas.DialogSelectFileRequest,
    async (req, ctx) => {
      const win = getWindow(ctx.senderId);
      const opts: Electron.OpenDialogOptions = {
        title: req.title ?? '파일 선택',
        properties: ['openFile'],
      };
      if (req.defaultPath) opts.defaultPath = req.defaultPath;
      if (req.filters) opts.filters = req.filters;
      const result = win
        ? await dialog.showOpenDialog(win, opts)
        : await dialog.showOpenDialog(opts);
      return {
        filePath: result.canceled ? null : (result.filePaths[0] ?? null),
      };
    },
  );

  registerHandler(Channels.Dialog.Alert, UtilitySchemas.DialogAlertRequest, async (req, ctx) => {
    const win = getWindow(ctx.senderId);
    const level = req.level ?? 'info';
    const typeMap = { info: 'info', warning: 'warning', error: 'error' } as const;
    const opts: Electron.MessageBoxOptions = {
      type: typeMap[level],
      title: req.title,
      message: req.message,
      buttons: ['확인'],
    };
    if (win) {
      await dialog.showMessageBox(win, opts);
    } else {
      await dialog.showMessageBox(opts);
    }
    return {};
  });

  registerHandler(
    Channels.Dialog.Confirm,
    UtilitySchemas.DialogConfirmRequest,
    async (req, ctx) => {
      const win = getWindow(ctx.senderId);
      const opts: Electron.MessageBoxOptions = {
        type: req.destructive ? 'warning' : 'question',
        title: req.title,
        message: req.message,
        buttons: [req.okText ?? '확인', req.cancelText ?? '취소'],
        defaultId: 0,
        cancelId: 1,
      };
      const result = win
        ? await dialog.showMessageBox(win, opts)
        : await dialog.showMessageBox(opts);
      return { confirmed: result.response === 0 };
    },
  );
}
