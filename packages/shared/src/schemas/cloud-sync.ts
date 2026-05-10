import { z } from 'zod';
import { Ulid } from './common';

/* ========================================================================
 * Cloud Sync (Supabase opt-in)
 * ======================================================================== */

export const CloudSyncStatus = z.enum([
  'disconnected',
  'connecting',
  'connected',
  'syncing',
  'error',
]);
export type CloudSyncStatus = z.infer<typeof CloudSyncStatus>;

export const CloudSyncDirection = z.enum(['upload', 'download', 'both']);
export type CloudSyncDirection = z.infer<typeof CloudSyncDirection>;

/**
 * cloud:connect
 */
export const CloudConnectRequest = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});
export type CloudConnectRequest = z.infer<typeof CloudConnectRequest>;

export const CloudConnectResponse = z.object({
  status: CloudSyncStatus,
  userId: z.string().optional(),
});
export type CloudConnectResponse = z.infer<typeof CloudConnectResponse>;

/**
 * cloud:disconnect
 */
export const CloudDisconnectResponse = z.object({
  status: z.literal('disconnected'),
});
export type CloudDisconnectResponse = z.infer<typeof CloudDisconnectResponse>;

/**
 * cloud:status
 */
export const CloudStatusResponse = z.object({
  status: CloudSyncStatus,
  userId: z.string().optional(),
  lastSyncAt: z.string().datetime().optional(),
  projectsSynced: z.number().int().nonnegative(),
});
export type CloudStatusResponse = z.infer<typeof CloudStatusResponse>;

/**
 * cloud:sync
 */
export const CloudSyncRequest = z.object({
  projectId: Ulid.optional(),
  direction: CloudSyncDirection.default('both'),
});
export type CloudSyncRequest = z.infer<typeof CloudSyncRequest>;

export const CloudSyncResponse = z.object({
  uploaded: z.number().int().nonnegative(),
  downloaded: z.number().int().nonnegative(),
  conflicts: z.number().int().nonnegative(),
  lastSyncAt: z.string().datetime(),
});
export type CloudSyncResponse = z.infer<typeof CloudSyncResponse>;

/**
 * cloud:listRemote
 */
export const CloudRemoteProject = z.object({
  projectId: Ulid,
  title: z.string(),
  updatedAt: z.string().datetime(),
  sizeBytes: z.number().int().nonnegative(),
});
export type CloudRemoteProject = z.infer<typeof CloudRemoteProject>;

export const CloudListRemoteResponse = z.object({
  projects: z.array(CloudRemoteProject),
});
export type CloudListRemoteResponse = z.infer<typeof CloudListRemoteResponse>;
