import { WebSocketServer, WebSocket } from 'ws';
import { BrowserWindow } from 'electron';
import { Channels } from '@videoforge/shared';
import { logger } from '../../logger';
import type {
  GrokBridgeStatusResponse,
  GrokBridgeSendRequest,
  GrokBridgeSetProjectRequest,
} from '@videoforge/shared';

const BRIDGE_PORT = 9821;

let wss: WebSocketServer | null = null;
const connectedClients = new Set<WebSocket>();
let currentProjectId: string | null = null;

function broadcast(type: string, data: unknown): void {
  const msg = JSON.stringify({ type, data });
  for (const ws of connectedClients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    }
  }
}

function broadcastToRenderer(channel: string, data: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, data);
  }
}

export function startBridgeServer(): void {
  if (wss) return;

  wss = new WebSocketServer({ port: BRIDGE_PORT });
  logger.info({ port: BRIDGE_PORT }, 'bridge.server.started');

  wss.on('connection', (ws) => {
    connectedClients.add(ws);
    logger.info({ clients: connectedClients.size }, 'bridge.client.connected');

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(String(raw)) as { type: string; data?: unknown };
        handleExtensionMessage(msg);
      } catch {
        logger.warn('bridge.message.parse.failed');
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      logger.info({ clients: connectedClients.size }, 'bridge.client.disconnected');
    });

    ws.on('error', (err) => {
      logger.error({ err: err.message }, 'bridge.client.error');
      connectedClients.delete(ws);
    });

    // Send current project context on connect
    if (currentProjectId) {
      ws.send(JSON.stringify({ type: 'setProject', data: { projectId: currentProjectId } }));
    }
  });

  wss.on('error', (err) => {
    logger.error({ err: err.message }, 'bridge.server.error');
  });
}

export function stopBridgeServer(): void {
  if (!wss) return;
  for (const ws of connectedClients) {
    ws.close();
  }
  connectedClients.clear();
  wss.close();
  wss = null;
  logger.info('bridge.server.stopped');
}

function handleExtensionMessage(msg: { type: string; data?: unknown }): void {
  switch (msg.type) {
    case 'progress':
      broadcastToRenderer(Channels.Grok.OnProgress, msg.data);
      break;
    case 'videoReady':
      broadcastToRenderer(Channels.Grok.OnVideoReady, msg.data);
      break;
    case 'extensionReady':
      logger.info('bridge.extension.ready');
      break;
    default:
      logger.debug({ type: msg.type }, 'bridge.message.unknown');
  }
}

export function getBridgeStatus(): GrokBridgeStatusResponse {
  return {
    available: wss !== null,
    connectedTabs: connectedClients.size,
  };
}

export function sendToExtension(req: GrokBridgeSendRequest): void {
  broadcast('generate', req.items);
}

export function cancelBridgeTasks(): void {
  broadcast('cancel', {});
}

export function setBridgeProject(req: GrokBridgeSetProjectRequest): void {
  currentProjectId = req.projectId;
  broadcast('setProject', { projectId: req.projectId });
}
