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
      // http/https만 허용 (보안)
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new UserFacingError('http 또는 https URL만 열 수 있습니다.');
      }
      await shell.openExternal(url);
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
