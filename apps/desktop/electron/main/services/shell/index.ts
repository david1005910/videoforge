import { shell, clipboard } from 'electron';
import { Channels, UtilitySchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { UserFacingError } from '../../ipc-router';

export function registerShellHandlers(): void {
  registerHandler(
    Channels.Shell.OpenExternal,
    UtilitySchemas.ShellOpenExternalRequest,
    async (req) => {
      const url = req.url;
      // http, https, file 프로토콜만 허용 (보안)
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        throw new UserFacingError('http, https 또는 file URL만 열 수 있습니다.');
      }
      if (url.startsWith('file://')) {
        // file:// → Finder에서 폴더 열기
        const filePath = decodeURIComponent(url.replace('file://', ''));
        shell.showItemInFolder(filePath);
      } else {
        await shell.openExternal(url);
      }
      return {};
    },
  );

  registerHandler(Channels.Clipboard.Write, UtilitySchemas.ClipboardWriteRequest, (req) => {
    clipboard.writeText(req.text);
    return Promise.resolve({});
  });

  registerHandler(Channels.Clipboard.WriteSync, UtilitySchemas.ClipboardWriteRequest, (req) => {
    clipboard.writeText(req.text);
    return Promise.resolve({});
  });
}
