import pino from 'pino';
import path from 'node:path';
import fs from 'fs-extra';
import { app } from 'electron';

/**
 * 메인 프로세스용 구조화 로거.
 *
 * - 개발 모드: pino-pretty (컬러)
 * - 프로덕션: ~/Library/Logs/VideoForge/main.jsonl (JSON Lines)
 */
function createLogger(): pino.Logger {
  const level = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

  if (!app.isPackaged) {
    return pino({
      level,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss.l',
          ignore: 'pid,hostname',
        },
      },
    });
  }

  const logDir = app.getPath('logs');
  fs.ensureDirSync(logDir);
  const logPath = path.join(logDir, 'main.jsonl');

  return pino(
    { level },
    pino.destination({
      dest: logPath,
      sync: false,
      mkdir: true,
    }),
  );
}

export const logger = createLogger();
