import { z } from 'zod';
import { Channels } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { generateErrorReport } from './error-report';

/**
 * P9-10: Diagnostics IPC handler registration.
 */
export function registerDiagnosticsHandlers(): void {
  registerHandler(
    Channels.Diagnostics.ErrorReport,
    z.object({ outputDir: z.string().min(1) }),
    async (req) => {
      const reportPath = await generateErrorReport(req.outputDir);
      return { reportPath };
    },
  );
}
