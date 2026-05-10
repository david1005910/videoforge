import { z } from 'zod';
import { Channels, CloudSyncSchemas } from '@videoforge/shared';
import { registerHandler } from '../../ipc-router';
import { logger } from '../../logger';
import type {
  CloudSyncStatus,
  CloudConnectRequest,
  CloudConnectResponse,
  CloudStatusResponse,
  CloudSyncRequest,
  CloudSyncResponse,
  CloudListRemoteResponse,
} from '@videoforge/shared';

let connectionStatus: CloudSyncStatus = 'disconnected';
let _supabaseUrl: string | null = null;
let userId: string | null = null;
let lastSyncAt: string | null = null;
const projectsSynced = 0;

function connect(req: CloudConnectRequest): CloudConnectResponse {
  connectionStatus = 'connecting';
  logger.info({ url: req.supabaseUrl }, 'cloud.connecting');

  // Store credentials (actual Supabase client integration deferred)
  _supabaseUrl = req.supabaseUrl;
  connectionStatus = 'connected';
  userId = 'pending-auth';

  logger.info('cloud.connected');
  return { status: connectionStatus, userId };
}

function disconnect(): { status: 'disconnected' } {
  _supabaseUrl = null;
  userId = null;
  connectionStatus = 'disconnected';
  logger.info('cloud.disconnected');
  return { status: 'disconnected' };
}

function getStatus(): CloudStatusResponse {
  const base: CloudStatusResponse = {
    status: connectionStatus,
    projectsSynced,
  };
  if (userId) {
    (base as Record<string, unknown>).userId = userId;
  }
  if (lastSyncAt) {
    (base as Record<string, unknown>).lastSyncAt = lastSyncAt;
  }
  return base;
}

function sync(req: CloudSyncRequest): CloudSyncResponse {
  logger.info({ projectId: req.projectId, direction: req.direction }, 'cloud.sync.start');

  // Placeholder: actual sync logic with Supabase deferred
  const now = new Date().toISOString();
  lastSyncAt = now;

  return {
    uploaded: 0,
    downloaded: 0,
    conflicts: 0,
    lastSyncAt: now,
  };
}

function listRemote(): CloudListRemoteResponse {
  // Placeholder: actual Supabase query deferred
  return { projects: [] };
}

export function registerCloudHandlers(): void {
  registerHandler(Channels.Cloud.Connect, CloudSyncSchemas.CloudConnectRequest, (req) =>
    Promise.resolve(connect(req)),
  );

  registerHandler(Channels.Cloud.Disconnect, z.object({}), () => Promise.resolve(disconnect()));

  registerHandler(Channels.Cloud.Status, z.object({}), () => Promise.resolve(getStatus()));

  registerHandler(Channels.Cloud.Sync, CloudSyncSchemas.CloudSyncRequest, (req) =>
    Promise.resolve(sync(req)),
  );

  registerHandler(Channels.Cloud.ListRemote, z.object({}), () => Promise.resolve(listRemote()));
}
