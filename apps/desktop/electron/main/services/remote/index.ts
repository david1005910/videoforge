import { WebSocketServer, WebSocket } from 'ws';
import { BrowserWindow } from 'electron';
import { Channels } from '@videoforge/shared';
import { logger } from '../../logger';
import { registerHandler } from '../../ipc-router';
import { z } from 'zod';
import { ChatRemoteSchemas } from '@videoforge/shared';
import type {
  RemoteInitRequest,
  RemoteInitResponse,
  RemoteScenesResponse,
} from '@videoforge/shared';
import * as crypto from 'node:crypto';
import * as net from 'node:net';

let wss: WebSocketServer | null = null;
let pairedClient: WebSocket | null = null;
let pairingCode: string | null = null;
let codeExpiresAt: Date | null = null;

const PAIRING_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generatePairingCode(length: number): string {
  const chars = '0123456789';
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += chars[(bytes[i] ?? 0) % chars.length];
  }
  return code;
}

function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    if (preferred > 0) {
      resolve(preferred);
      return;
    }
    const srv = net.createServer();
    srv.listen(0, () => {
      const addr = srv.address();
      if (addr && typeof addr === 'object') {
        const port = addr.port;
        srv.close(() => resolve(port));
      } else {
        srv.close(() => reject(new Error('Could not find free port')));
      }
    });
    srv.on('error', reject);
  });
}

function broadcastToRenderer(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data);
  }
}

async function initRemote(req: RemoteInitRequest): Promise<RemoteInitResponse> {
  // Stop existing server if running
  stopRemote();

  const port = await findFreePort(req.port);
  const code = generatePairingCode(req.codeLength);
  const expiresAt = new Date(Date.now() + PAIRING_TTL_MS);

  pairingCode = code;
  codeExpiresAt = expiresAt;

  wss = new WebSocketServer({ port });
  logger.info({ port }, 'remote.server.started');

  wss.on('connection', (ws) => {
    // Require pairing handshake
    let authenticated = false;

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(String(raw)) as { type: string; data?: unknown };

        if (!authenticated) {
          if (msg.type === 'pair' && isPairingValid(msg.data)) {
            authenticated = true;
            pairedClient = ws;
            ws.send(JSON.stringify({ type: 'paired', data: { ok: true } }));
            logger.info('remote.client.paired');
          } else {
            ws.send(JSON.stringify({ type: 'paired', data: { ok: false, error: 'invalid_code' } }));
            ws.close();
          }
          return;
        }

        handleRemoteMessage(msg);
      } catch {
        logger.warn('remote.message.parse.failed');
      }
    });

    ws.on('close', () => {
      if (ws === pairedClient) {
        pairedClient = null;
        logger.info('remote.client.disconnected');
      }
    });

    ws.on('error', (err) => {
      logger.error({ err: err.message }, 'remote.client.error');
    });
  });

  wss.on('error', (err) => {
    logger.error({ err: err.message }, 'remote.server.error');
  });

  return {
    port,
    pairingCode: code,
    expiresAt: expiresAt.toISOString(),
  };
}

function isPairingValid(data: unknown): boolean {
  if (!pairingCode || !codeExpiresAt) return false;
  if (new Date() > codeExpiresAt) return false;
  if (typeof data !== 'object' || data === null) return false;
  return (data as { code?: string }).code === pairingCode;
}

function handleRemoteMessage(msg: { type: string; data?: unknown }): void {
  switch (msg.type) {
    case 'getScenes':
      broadcastToRenderer(Channels.Remote.OnGetScenes, msg.data);
      break;
    case 'command':
      broadcastToRenderer(Channels.Remote.OnCommand, msg.data);
      break;
    default:
      logger.debug({ type: msg.type }, 'remote.message.unknown');
  }
}

function sendScenes(resp: RemoteScenesResponse): void {
  if (pairedClient && pairedClient.readyState === WebSocket.OPEN) {
    pairedClient.send(JSON.stringify({ type: 'scenes', data: resp }));
  }
}

function sendResponse(data: unknown): void {
  if (pairedClient && pairedClient.readyState === WebSocket.OPEN) {
    pairedClient.send(JSON.stringify({ type: 'response', data }));
  }
}

function stopRemote(): void {
  if (pairedClient) {
    pairedClient.close();
    pairedClient = null;
  }
  if (wss) {
    wss.close();
    wss = null;
  }
  pairingCode = null;
  codeExpiresAt = null;
}

export function registerRemoteHandlers(): void {
  // remote:init
  registerHandler(Channels.Remote.Init, ChatRemoteSchemas.RemoteInitRequest, (req) =>
    initRemote(req),
  );

  // remote:sendScenes
  registerHandler(Channels.Remote.SendScenes, ChatRemoteSchemas.RemoteScenesResponse, (req) => {
    sendScenes(req);
    return Promise.resolve();
  });

  // remote:sendResponse
  registerHandler(Channels.Remote.SendResponse, z.object({ payload: z.unknown() }), (req) => {
    sendResponse(req.payload);
    return Promise.resolve();
  });
}
