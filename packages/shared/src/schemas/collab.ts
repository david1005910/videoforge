import { z } from 'zod';
import { Ulid, FilePath } from './common';

/* ========================================================================
 * Collaboration / Shared Library
 * ======================================================================== */

export const CollabAssetType = z.enum(['template', 'font', 'sfx', 'preset', 'prompt']);
export type CollabAssetType = z.infer<typeof CollabAssetType>;

/**
 * Shared library item
 */
export const SharedAsset = z.object({
  id: Ulid,
  type: CollabAssetType,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  author: z.string().max(100).optional(),
  tags: z.array(z.string().max(50)).max(20),
  version: z.string().default('1.0.0'),
  sizeBytes: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SharedAsset = z.infer<typeof SharedAsset>;

/**
 * collab:publish
 */
export const CollabPublishRequest = z.object({
  type: CollabAssetType,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  filePath: FilePath,
  tags: z.array(z.string().max(50)).max(20).default([]),
});
export type CollabPublishRequest = z.infer<typeof CollabPublishRequest>;

export const CollabPublishResponse = z.object({
  assetId: Ulid,
  publishedAt: z.string().datetime(),
});
export type CollabPublishResponse = z.infer<typeof CollabPublishResponse>;

/**
 * collab:browse
 */
export const CollabBrowseRequest = z.object({
  type: CollabAssetType.optional(),
  query: z.string().max(200).optional(),
  tags: z.array(z.string()).max(10).optional(),
  offset: z.number().int().nonnegative().default(0),
  limit: z.number().int().min(1).max(100).default(20),
});
export type CollabBrowseRequest = z.infer<typeof CollabBrowseRequest>;

export const CollabBrowseResponse = z.object({
  items: z.array(SharedAsset),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
});
export type CollabBrowseResponse = z.infer<typeof CollabBrowseResponse>;

/**
 * collab:download
 */
export const CollabDownloadRequest = z.object({
  assetId: Ulid,
  outputDir: FilePath,
});
export type CollabDownloadRequest = z.infer<typeof CollabDownloadRequest>;

export const CollabDownloadResponse = z.object({
  assetId: Ulid,
  localPath: FilePath,
  sizeBytes: z.number().int().nonnegative(),
});
export type CollabDownloadResponse = z.infer<typeof CollabDownloadResponse>;

/**
 * collab:delete (own published asset)
 */
export const CollabDeleteRequest = z.object({
  assetId: Ulid,
});
export type CollabDeleteRequest = z.infer<typeof CollabDeleteRequest>;
