import { z } from 'zod';

/**
 * app:ping — Phase 0 smoke test channel
 */
export const PingRequest = z.object({
  message: z.string().min(1).max(1000),
});
export type PingRequest = z.infer<typeof PingRequest>;

export const PingResponse = z.object({
  echo: z.string(),
  receivedAt: z.string().datetime(),
  pid: z.number().int().positive(),
});
export type PingResponse = z.infer<typeof PingResponse>;

/**
 * app:getVersion
 */
export const VersionResponse = z.object({
  app: z.string(),
  electron: z.string(),
  node: z.string(),
  chrome: z.string(),
  v8: z.string(),
  platform: z.literal('darwin'),
  arch: z.enum(['arm64', 'x64']),
});
export type VersionResponse = z.infer<typeof VersionResponse>;
