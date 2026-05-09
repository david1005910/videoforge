import { Channels, UtilitySchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { createWindow, getWindowCount } from '../../window-manager';

export function registerWindowHandlers(): void {
  registerHandler(Channels.Window.OpenNew, UtilitySchemas.WindowOpenNewRequest, (req) => {
    const opts: Parameters<typeof createWindow>[0] = {};
    if (req.initialRoute) opts.initialRoute = req.initialRoute;
    createWindow(opts);
    return Promise.resolve({ count: getWindowCount() });
  });

  registerHandler(Channels.Window.Count, UtilitySchemas.WindowOpenNewRequest.partial(), () =>
    Promise.resolve({ count: getWindowCount() }),
  );
}
