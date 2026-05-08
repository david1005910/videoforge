import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { z } from 'zod';
import type { ChannelName, IpcResponse } from '@videoforge/shared';
import { logger } from './logger';

/**
 * 사용자에게 직접 보여줄 수 있는 에러 메시지를 가진 예외.
 *
 * 일반 Error는 사용자에게 "알 수 없는 오류"로 마스킹되지만,
 * UserFacingError는 메시지가 그대로 노출된다.
 */
export class UserFacingError extends Error {
  constructor(
    message: string,
    public hint?: string,
    public code: string = 'USER',
  ) {
    super(message);
    this.name = 'UserFacingError';
  }
}

interface HandlerContext {
  senderId: number;
  event: IpcMainInvokeEvent;
}

type Handler<I, O> = (input: I, ctx: HandlerContext) => Promise<O>;

/**
 * 타입 안전 IPC 핸들러 등록 헬퍼.
 *
 * - input은 zod 스키마로 자동 검증
 * - 실패 응답은 항상 { ok: false, error: {...} } 봉투
 * - 호출 시간/결과를 자동 로깅
 *
 * @example
 * registerHandler(Channels.Tts.Edge, TtsRequest, async (req) => {
 *   return ttsEdge(req);
 * });
 */
export function registerHandler<I, O>(
  channel: ChannelName,
  inputSchema: z.ZodType<I>,
  handler: Handler<I, O>,
): void {
  if (registered.has(channel)) {
    throw new Error(`IPC channel "${channel}" already registered`);
  }
  registered.add(channel);

  ipcMain.handle(channel, async (event, raw: unknown): Promise<IpcResponse<O>> => {
    const start = Date.now();
    const senderId = event.sender.id;

    try {
      const input = inputSchema.parse(raw);
      const data = await handler(input, { senderId, event });
      logger.info(
        { ch: channel, ms: Date.now() - start, sender: senderId },
        'ipc.ok',
      );
      return { ok: true, data };
    } catch (err) {
      const elapsed = Date.now() - start;

      if (err instanceof z.ZodError) {
        logger.warn(
          { ch: channel, ms: elapsed, issues: err.issues },
          'ipc.validation',
        );
        return {
          ok: false,
          error: {
            code: 'VALIDATION',
            message: '잘못된 요청 형식입니다',
            hint: err.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
          },
        };
      }

      if (err instanceof UserFacingError) {
        logger.warn({ ch: channel, ms: elapsed, msg: err.message }, 'ipc.user-error');
        return {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
            hint: err.hint,
          },
        };
      }

      logger.error({ ch: channel, ms: elapsed, err }, 'ipc.error');
      return {
        ok: false,
        error: {
          code: 'UNKNOWN',
          message: '알 수 없는 오류가 발생했습니다',
          hint: err instanceof Error ? err.message : String(err),
        },
      };
    }
  });
}

/**
 * 등록된 모든 채널 해제 (테스트 / 핫 리로드용).
 */
export function unregisterAll(): void {
  for (const ch of registered) {
    ipcMain.removeHandler(ch);
  }
  registered.clear();
}

const registered = new Set<ChannelName>();
